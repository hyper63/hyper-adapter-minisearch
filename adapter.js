import { crocks, MiniSearch, R } from "./deps.js";

const { always, allPass, keys, reduce, assoc, compose, merge, map } = R;

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
  *
  * @typedef {Object} IndexInfo
  * @property {string} index - index name
  * @property {object} mappings - index setup
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
  * @property {string} [msg]
 */

const { Async } = crocks;

export default function (db) {
  const indexes = new Map();
  const list = Async.fromPromise(db.listByType.bind(db));
  const post = Async.fromPromise(db.post.bind(db));
  const get = Async.fromPromise(db.get.bind(db));
  const put = Async.fromPromise(db.put.bind(db));
  const remove = Async.fromPromise(db.remove.bind(db));

  // load search engine

  list("index")
    .map(
      map((
        { doc },
      ) => (indexes.set(doc.id, new MiniSearch(doc.mappings)), doc)),
    )
    .chain(() => list("doc"))
    .map(map((record) => indexes.get(record.parent).add(record.doc)))
    .fork(
      (e) => console.log(e),
      (_) =>
        console.log({
          INFO: "loaded search engines",
          DATE: new Date().toISOString(),
        }),
    );

  /**
   * @param {IndexInfo}
   * @returns {Promise<Response>}
   */
  async function createIndex({ index, mappings }) {
    if (indexes.get(index)) {
      return Promise.resolve({ ok: true });
    }
    const sindex = new MiniSearch(mappings);
    await db.post({
      id: index,
      type: "index",
      parent: "root",
      doc: {
        id: index,
        mappings,
      },
    });
    indexes.set(index, sindex);
    return Promise.resolve({ ok: true });
  }

  /**
   * @param {string} name
   * @returns {Promise<Response>}
   */
  async function deleteIndex(name) {
    if (!indexes.get(name)) {
      return Promise.resolve({ ok: true });
    }
    indexes.delete(name);
    await db.remove({ id: name, type: "index", parent: "root" }).then(() =>
      db.removeByParent(name)
    );
    return Promise.resolve({ ok: true });
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
              ? Async.Rejected({
                ok: false,
                status: 409,
                msg: "document conflict",
              })
              : Async.Resolved(ctx)
          )
      )
      .chain(post)
      .map(() => indexes.get(index).add(assoc("id", key, doc)))
      .map(() => ({ ok: true }))
      .toPromise();
  }

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  function getDoc({ index, key }) {
    return Async.of({ id: key, type: "doc", parent: index })
      .chain(get)
      .map((doc) => ({ ok: true, key, doc }))
      .toPromise();
  }

  /**
   * @param {SearchDoc}
   * @returns {Promise<Response>}
   */
  function updateDoc({ index, key, doc }) {
    return get({ id: key, parent: index, type: "doc" })
      .map((_) => (console.log(_), _))
      .map((oldDoc) => (indexes.get(index).remove(oldDoc), oldDoc))
      .chain((oldDoc) =>
        put({ id: key, parent: index, type: "doc", doc: merge(oldDoc, doc) })
      )
      .map(always({ ok: true }))
      .toPromise();
  }

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  function removeDoc({ index, key }) {
    return Async.of({ id: key, type: "doc", parent: index })
      .chain(get)
      .map((oldDoc) => (indexes.get(index).remove(oldDoc), oldDoc))
      .chain(() => remove({ id: key, type: "doc", parent: index }))
      .map(always({ ok: true }))
      .toPromise();
  }

  /**
   * @param {BulkIndex}
   * @returns {Promise<ResponseWitResults>}
   */
  function bulk({ index, docs }) {
    return Async.of({ parent: index, docs })
      .map((ctx) => (indexes.get(ctx.parent).addAll(ctx.docs), ctx))
      .chain((ctx) =>
        Async.all(
          map(
            compose(
              post,
              (doc) => ({ id: doc.id, type: "doc", parent: ctx.parent, doc }),
            ),
            docs,
          ),
        )
      )
      .map((docs) => ({ ok: true, docs }))
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
   *
   * @param {SearchQuery}
   * @returns {Promise<Array>}
   */
  function query({ index, q: { query, fields, filter } }) {
    if (!index) {
      return Promise.reject({ ok: false, msg: "index name is required!" });
    }
    if (!query) return Promise.reject({ ok: false, msg: "query is required!" });

    const search = indexes.get(index);
    let options = {};
    // if fields
    options = fields ? { ...options, fields } : options;
    if (filter) {
      options = { ...options, filter: createFilterFn(filter) };
    }

    const results = search.search(query, options);
    return Promise.resolve({ ok: true, matches: results });
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
