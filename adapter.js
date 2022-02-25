import { crocks, R } from "./deps.js";
import { handleHyperErr, HyperErr } from "./utils.js";

const { always, allPass, keys, reduce, assoc, compose, map } = R;

// types

/**
 * @typedef {Object} Mappings
 * @property {string} [idField] - unique id of doc
 * @property {function} [extractField] - function used to get value of a given field if not a string. (doc, fn) -> value
 * @property {function} [tokenize] - function used to override the tokenization of a given field
 * @property {function} [processTerm] - function used to process each token before indexing
 * @property {Object} [searchOptions]
 * @property {Array} fields - fields to be used to search
 * @property {Array} [storeFields] - fields to be return as result
 *
 * @typedef {Object} SearchDoc
 * @property {string} index
 * @property {string} key
 * @property {Object} doc
 *
 * @typedef {Object} SearchInfo
 * @property {string} index
 * @property {string} key
 *
 * @typedef {Object} SearchOptions
 * @property {Array<string>} fields
 * @property {Object} boost
 * @property {boolean} prefix
 *
 * @typedef {Object} SearchQuery
 * @property {string} index
 * @property {string} query
 * @property {SearchOptions} [options]
 *
 * @typedef {Object} Response
 * @property {boolean} ok
 * @property {number} [status]
 * @property {string} [msg]
 */

const { Async } = crocks;

const load = (fn) => compose(Async.all, map(fn));
const fork = (m) =>
  m.fork(
    (e) => console.log("ERROR: ", e.message),
    (_) =>
      console.log(
        `{ INFO: "loaded search engines", DATE: ${new Date().toISOString()} }`,
      ),
  );

export default function ({ db, se }) {
  const list = Async.fromPromise(db.listByType.bind(db));
  const post = Async.fromPromise(db.post.bind(db));
  const get = Async.fromPromise(db.get.bind(db));
  //const put = Async.fromPromise(db.put.bind(db));
  const remove = Async.fromPromise(db.remove.bind(db));
  const removeByParent = Async.fromPromise(db.removeByParent.bind(db));

  const create = Async.fromPromise(se.create.bind(se));
  const destroy = Async.fromPromise(se.destroy.bind(se));
  const add = Async.fromPromise(se.add.bind(se));
  const seRemove = Async.fromPromise(se.remove.bind(se));
  const seBulk = Async.fromPromise(se.bulk.bind(se));
  const search = Async.fromPromise(se.search.bind(se));
  const exists = Async.fromPromise(se.exists.bind(se));

  // load search engine
  fork(
    list("index")
      .chain(
        load(({ doc }) => create({ index: doc.id, mappings: doc.mappings })),
      )
      .chain(() => list("doc"))
      .chain(load((record) => add({ index: record.parent, doc: record.doc }))),
  );

  /**
   * @typedef {Object} SearchIndex
   * @property {string} index - index name
   * @property {object} mappings - index setup
   *
   * @param {SearchIndex}
   * @returns {Promise<Response>}
   */
  function createIndex({ index, mappings }) {
    return exists(index)
      .chain((exists) =>
        exists
          ? Async.Rejected(
            HyperErr({ status: 409, msg: "index already exists" }),
          )
          : Async.Resolved({ index, mappings })
      )
      .chain(create).map((_) => ({ index, mappings }))
      .chain((ctx) =>
        post({
          id: ctx.index,
          type: "index",
          parent: "root",
          doc: { id: ctx.index, mappings: ctx.mappings },
        })
      )
      .bichain(
        handleHyperErr,
        (_) => Async.Resolved({ ok: true }),
      )
      .toPromise();
  }

  /**
   * @param {string} index
   * @returns {Promise<Response>}
   */
  function deleteIndex(index) {
    return Async.all([
      destroy(index),
      remove({ id: index, type: "index", parent: "root" }),
      removeByParent(index),
    ])
      .bimap(() => HyperErr({ status: 400 }), () => ({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {SearchDoc}
   * @returns {Promise<Response>}
   */
  function indexDoc({ index, key, doc }) {
    return Async.of({ id: key, type: "doc", parent: index, doc })
      .chain((ctx) =>
        get(ctx)
          // if doc exists then reject as 409 conflict
          .chain((doc) =>
            doc
              ? Async.Rejected(HyperErr({
                status: 409,
                msg: "document conflict",
              }))
              : Async.Resolved(ctx)
          )
      )
      .chain(post)
      .chain(() => add({ index, doc: assoc("id", key, doc) }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  function getDoc({ index, key }) {
    return Async.of({ id: key, type: "doc", parent: index })
      .chain(get)
      .chain((doc) =>
        doc
          ? Async.Resolved(doc)
          : Async.Rejected(HyperErr({ status: 404, msg: "not found" }))
      )
      .map(
        (doc) => ({ ok: true, key, doc }),
      )
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {SearchDoc}
   * @returns {Promise<Response>}
   */
  // not implementing update
  function updateDoc() {
    return Promise.resolve(HyperErr({ status: 501, msg: "Not Implemented" }));
  }
  /*
  function updateDoc({ index, key, doc }) {
    return get({ id: key, parent: index, type: "doc" })
      .chain((doc) => doc ? Async.Resolved(doc) : Async.Rejected({}))
      .chain((oldDoc) => seRemove({ index, doc: oldDoc }).map((_) => oldDoc))
      .bichain(
        (oldDoc) => Async.Resolved(merge(oldDoc, doc)),
        (oldDoc) => Async.Resolved(merge(oldDoc, doc)),
      )
      .chain((doc) =>
        Async.all([
          put({ id: key, parent: index, type: "doc", doc }),
          add({ index, doc }),
        ])
      )
      .map(always({ ok: true }))
      .toPromise();
  }
  */

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  function removeDoc({ index, key }) {
    return Async.of({ id: key, type: "doc", parent: index })
      .chain(get)
      .chain((doc) =>
        doc
          ? Async.Resolved(doc)
          : Async.Rejected(HyperErr({ status: 404, msg: "not found" }))
      )
      .chain((oldDoc) => seRemove({ index, doc: oldDoc }).map((_) => oldDoc))
      .chain(() => remove({ id: key, type: "doc", parent: index }))
      .map(always({ ok: true }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  /**
   * @param {BulkIndex}
   * @returns {Promise<ResponseWitResults>}
   */
  function bulk({ index, docs }) {
    return seBulk({ index, docs }).map((_) => ({ parent: index, docs }))
      .chain((ctx) =>
        Async.all(
          map(
            compose(
              (indexDoc) =>
                post(indexDoc).map((_) => ({ ok: true, id: indexDoc.id })),
              (doc) => ({ id: doc.id, type: "doc", parent: ctx.parent, doc }),
            ),
            docs,
          ),
        )
      )
      .map((results) => ({ ok: true, results }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  function createFilterFn(object) {
    return allPass(reduce(
      (acc, k) => {
        return acc.concat((result) => result[k] === object[k]);
      },
      [],
      keys(object),
    ));
  }
  /**
   * @param {SearchQuery}
   * @returns {Promise<Array>}
   */
  function query({ index, q: { query, fields, filter } }) {
    return Async.of({ query, index, filter })
      .chain(({ query, index, filter }) => {
        if (!index) {
          return Async.Rejected(
            HyperErr({ status: 422, msg: "index name is required!" }),
          );
        }
        if (!query) {
          return Async.Rejected(
            HyperErr({ status: 422, msg: "query is required!" }),
          );
        }

        let options = {};
        // if fields
        options = fields ? { ...options, fields } : options;
        if (filter) {
          options = { ...options, filter: createFilterFn(filter) };
        }

        return Async.Resolved(options);
      })
      .chain((options) => search({ index, query, options }))
      .map((matches) => ({ ok: true, matches }))
      .bichain(
        handleHyperErr,
        Async.Resolved,
      )
      .toPromise();
  }

  return Object.freeze({
    createIndex,
    deleteIndex,
    indexDoc,
    getDoc,
    updateDoc,
    removeDoc,
    bulk,
    query,
  });
}
