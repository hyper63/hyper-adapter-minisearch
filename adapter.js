import { crocks, MiniSearch, R } from "./deps.js";

const { allPass, keys, reduce, assoc, compose, merge, map, prop } = R;

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

  // load search engine

  list("index")
    .map(map((idx) => (indexes.set(idx.id, new MiniSearch(idx.mappings)), idx)))
    .chain(() => list("doc"))
    .map(map((doc) => indexes.get(doc.parent).add(doc)))
    .fork(
      (e) => console.log(e),
      (r) =>
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
      mappings,
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
    await db.remove(name).then(() => db.removeByParent(name));
    return Promise.resolve({ ok: true });
  }

  /**
   * @param {SearchDoc}
   * @returns {Promise<Response>}
   */
  function indexDoc({ index, key, doc }) {
    return Async.of({ index, key, doc })
      .chain((ctx) =>
        get(ctx.key, "doc", ctx.index)
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
      .chain(compose(
        post,
        assoc("id", key),
        assoc("type", "doc"),
        assoc("parent", index),
        prop("doc"),
      ))
      .map(() => indexes.get(index).add(assoc("id", key, doc)))
      .map(() => ({ ok: true }))
      .toPromise();
  }

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  function getDoc({ index, key }) {
    return Promise.resolve({ index, key })
      .then((_) =>
        _.index
          ? _
          : Promise.reject({ ok: false, msg: "index name is required!" })
      )
      .then((_) =>
        _.key ? _ : Promise.reject({ ok: false, msg: "key is required!" })
      )
      .then(({ key }) => db.get(key))
      .then((doc) => ({ ok: true, key, doc }));
  }

  /**
   * @param {SearchDoc}
   * @returns {Promise<Response>}
   */
  function updateDoc({ index, key, doc }) {
    return Promise.resolve({ index, key, doc })
      .then((_) =>
        _.index
          ? _
          : Promise.reject({ ok: false, msg: "index name is required!" })
      )
      .then((_) =>
        _.key ? _ : Promise.reject({ ok: false, msg: "key is required!" })
      )
      .then((_) =>
        _.doc ? _ : Promise.reject({ ok: false, msg: "doc is required!" })
      )
      .then(async (_) => {
        const olddoc = await db.get(_.key);
        if (!olddoc) {
          return Promise.reject({
            ok: false,
            status: 404,
            msg: "doc is not found!",
          });
        }
        indexes.get(_.index).remove(olddoc);
        indexes.get(_.index).add(_.doc);
        await db.put(merge(olddoc, _.doc));
        return { ok: true };
      });
  }

  /**
   * @param {SearchInfo}
   * @returns {Promise<Response>}
   */
  async function removeDoc({ index, key }) {
    if (!index) {
      return Promise.reject({ ok: false, msg: "index name is required!" });
    }
    if (!key) return Promise.reject({ ok: false, msg: "key is required!" });

    const search = indexes.get(index);
    //const store = datastores.get(index);
    const oldDoc = await db.get(key);
    if (!oldDoc) {
      return Promise.reject({ ok: false, status: 404, msg: "Not found" });
    }
    search.remove(oldDoc);
    //store.delete(key);
    await db.remove(key);
    return Promise.resolve({ ok: true });
  }

  /**
   * @param {BulkIndex}
   * @returns {Promise<ResponseWitResults>}
   */
  async function bulk({ index, docs }) {
    if (!index) {
      return Promise.reject({ ok: false, msg: "index name is required!" });
    }
    if (!docs) return Promise.reject({ ok: false, msg: "docs is required!" });

    const search = indexes.get(index);
    search.addAll(docs);
    //const store = datastores.get(index);
    //docs.map((doc) => store.set(doc.id, doc));
    await Promise.all(docs.map(db.post));
    return Promise.resolve({ ok: true, results: [] });
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
