import { assert, assertEquals } from "./dev_deps.js";
import { crocks, DB } from "./deps.js";
import dal from "./dal.js";

import createAdapter from "./adapter.js";

const adapter = createAdapter(dal(new DB("./test.db")));

const test = Deno.test;
const { Async } = crocks;

const setup = (name) =>
  Async.fromPromise(adapter.createIndex.bind(adapter))({
    index: name,
    mappings: {
      fields: ["title", "body"],
      storeFields: ["title", "body", "category"],
    },
  });

const cleanup = (name) =>
  () => Async.fromPromise(adapter.deleteIndex.bind(adapter))(name);

const addDoc = (index) =>
  (doc) =>
    Async.fromPromise(adapter.indexDoc.bind(adapter))({
      index: index,
      key: doc.id,
      doc,
    });

const updateDoc = (index) =>
  (doc) =>
    Async.fromPromise(adapter.updateDoc.bind(adapter))({
      index: index,
      key: doc.id,
      doc,
    });

const get = (index, key) =>
  Async.fromPromise(adapter.getDoc.bind(adapter))({
    index,
    key,
  });

const remove = (index, key) =>
  Async.fromPromise(adapter.removeDoc.bind(adapter))({
    index,
    key,
  });

const movies = [
  { id: "movie-1", type: "movie", title: "Ghostbusters" },
  { id: "movie-2", type: "movie", title: "Dune" },
  { id: "movie-3", type: "movie", title: "Jaws" },
];

const addAll = (index) =>
  (docs) =>
    Async.fromPromise(adapter.bulk.bind(adapter))({
      index,
      docs,
    });

const search = (index) =>
  (query) =>
    Async.fromPromise(adapter.query.bind(adapter))({
      index,
      q: { query },
    });

test("create index", () =>
  setup("test-1")
    .map((res) => assert(res.ok))
    .chain(cleanup("test-1"))
    .toPromise());

test("add search doc", () =>
  setup("test-2")
    .map(() => ({
      id: "1",
      title: "SOC",
      body: "hello world",
      category: "any",
    }))
    .chain(addDoc("test-2"))
    .map((res) => (assert(res.ok), res))
    .chain(cleanup("test-2"))
    .toPromise());

test("update doc", () =>
  setup("test-3")
    .map(() => ({
      id: "1",
      title: "Ghostbusters",
      type: "movie",
      category: "scifi",
    }))
    .chain(addDoc("test-3"))
    .map(() => ({
      id: "1",
      title: "Ghostbusters 2",
      type: "movie",
      category: "scifi",
    }))
    .chain(updateDoc("test-3"))
    .map((res) => (assert(res.ok), res))
    .chain(cleanup("test-3"))
    .toPromise());

test("get document", () =>
  setup("test-4")
    .map(() => ({ id: "3", type: "movie", title: "Jaws" }))
    .chain(addDoc("test-4"))
    .chain(() => get("test-4", "3"))
    .map((v) => (assert(v.ok), v))
    .map((v) => (assertEquals(v.doc.title, "Jaws"), v))
    .chain(cleanup("test-4"))
    .toPromise());

test("remove document", () =>
  setup("test-5")
    .map(() => ({ id: "4", type: "movie", title: "Dune" }))
    .chain(addDoc("test-5"))
    .chain(() => remove("test-5", "4"))
    .map((v) => (assert(v.ok), v))
    .chain(cleanup("test-5"))
    .toPromise());

test("add docs and search", () =>
  setup("test-6")
    .chain(() => addAll("test-6")(movies))
    .map((v) => (assert(v.ok), v))
    .chain(() => search("test-6")("Dune"))
    .map((v) => (assert(v.ok), v))
    //.map((v) => (console.log(v), v))
    .chain(cleanup("test-6"))
    .toPromise());
