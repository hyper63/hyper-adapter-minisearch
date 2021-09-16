// minisearch accesslayer
import { crocks, MiniSearch } from "./deps.js";

const { tryCatch, compose } = crocks;

const fold = (m) =>
  m.either(
    (e) => Promise.reject({ ok: false, message: "SAL:" + e.message }),
    (_) => Promise.resolve({ ok: true }),
  );

const foldIdentity = (m) =>
  m.either(
    (e) => Promise.reject({ ok: false, message: "SAL:" + e.message }),
    (r) => Promise.resolve(r),
  );

const foldExists = (m) =>
  m.either(
    (e) => Promise.reject({ ok: false, message: "SAL:" + e.message }),
    (r) => Promise.resolve(r ? true : false),
  );

export default function () {
  const indexes = new Map();

  /**
   * @typedef {Object} Mappings
   * @property { array<string> } fields
   * @property { array<string> } [storeFields]
   *
   * @typedef {Object} MiniSearch
   * @property { string } index
   * @property { Mappings } mappings
   *
   * @param {MiniSearch},
   */
  const create = compose(
    fold,
    tryCatch(({ index, mappings }) =>
      indexes.set(index, new MiniSearch(mappings))
    ),
  );

  /**
   * @param { string } index
   */
  const destroy = compose(
    fold,
    tryCatch((index) => indexes.delete(index)),
  );

  /**
   * @typedef {Object} SalDocument
   * @property { string } index
   * @property { Object } doc
   */

  /**
   * @param { SalDocument }
   */
  const add = compose(
    fold,
    tryCatch(({ index, doc }) => indexes.get(index).add(doc)),
  );

  /**
   *
   * @param { SalDocument }
   */
  const remove = compose(
    fold,
    tryCatch(({ index, doc }) => indexes.get(index).remove(doc)),
  );

  /**
   * @typedef { Object } SalDocuments
   * @property { string } index
   * @property { Array<unknown> } docs
   *
   * @param { SalDocuments }
   */
  const bulk = compose(
    fold,
    tryCatch(({ index, docs }) => indexes.get(index).addAll(docs)),
  );

  /**
   * @typedef { Object } SalSearch
   * @property { string } index
   * @property { string } query
   * @property { Object } options
   *
   * @param { SalSearch }
   */
  const search = compose(
    foldIdentity,
    tryCatch(({ index, query, options }) =>
      indexes.get(index).search(query, options)
    ),
  );

  const exists = compose(
    foldExists,
    tryCatch((index) => indexes.get(index)),
  );

  return Object.freeze({
    create,
    destroy,
    add,
    remove,
    bulk,
    search,
    exists,
  });
}
