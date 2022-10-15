import { assert, assertEquals } from "./dev_deps.js";
import { crocks, DB } from "./deps.js";
import dal from "./dal.js";
import sal from "./sal.js";

import createAdapter from "./adapter.js";

const adapter = createAdapter({ db: dal(new DB("./test.db")), se: sal() });

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

const cleanup = (name) => () =>
  Async.fromPromise(adapter.deleteIndex.bind(adapter))(name);

const addDoc = (index) => (doc) =>
  Async.fromPromise(adapter.indexDoc.bind(adapter))({
    index: index,
    key: doc.id,
    doc,
  });

// const updateDoc = (index) =>
//   (doc) =>
//     Async.fromPromise(adapter.updateDoc.bind(adapter))({
//       index: index,
//       key: doc.id,
//       doc,
//     });

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

const addAll = (index) => (docs) =>
  Async.fromPromise(adapter.bulk.bind(adapter))({
    index,
    docs,
  });

const query = (index) => (query) =>
  Async.fromPromise(adapter.query.bind(adapter))({
    index,
    q: { query },
  });

test("create index", () =>
  setup("test-1")
    .map((res) => assert(res.ok))
    .chain(cleanup("test-1"))
    .toPromise());

test("create index - already exists", () =>
  setup("test-1")
    .chain(() => setup("test-1"))
    .map((res) => {
      assert(!res.ok);
      assert(res.msg);
      assertEquals(res.status, 409);
    })
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

test("add search doc - already exists", () =>
  setup("test-2")
    .map(() => ({
      id: "1",
      title: "SOC",
      body: "hello world",
      category: "any",
    }))
    .chain((doc) => addDoc("test-2")(doc).map(() => doc))
    .chain(addDoc("test-2")) // add it again
    .map((res) => {
      assert(!res.ok);
      assert(res.msg);
      assertEquals(res.status, 409);
    })
    .chain(cleanup("test-2"))
    .toPromise());

/*
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
*/

test("get document", () =>
  setup("test-4")
    .map(() => ({ id: "3", type: "movie", title: "Jaws" }))
    .chain(addDoc("test-4"))
    .chain(() => get("test-4", "3"))
    .map((v) => (assert(v.ok), v))
    .map((v) => (assertEquals(v.doc.title, "Jaws"), v))
    .chain(cleanup("test-4"))
    .toPromise());

test("get document - not found", () =>
  setup("test-4")
    .chain(() => get("test-4", "not-found"))
    .map((res) => {
      assert(!res.ok);
      assert(res.msg);
      assertEquals(res.status, 404);
    })
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

test("remove document - not found", () =>
  setup("test-5")
    .chain(() => remove("test-5", "not-found"))
    .map((res) => {
      assert(!res.ok);
      assert(res.msg);
      assertEquals(res.status, 404);
    })
    .chain(cleanup("test-5"))
    .toPromise());

test("add docs and query", () =>
  setup("test-6")
    .chain(() => addAll("test-6")(movies))
    .map((v) => (assert(v.ok), v))
    .chain(() => query("test-6")("Dune"))
    .map((v) => (assert(v.ok), v))
    //.map((v) => (console.log(v), v))
    .chain(cleanup("test-6"))
    .toPromise());

test("add docs and query - no index", () =>
  setup("test-6")
    .chain(() => query()("Dune"))
    .map((res) => {
      assert(!res.ok);
      assertEquals(res.msg, "index name is required!");
      assertEquals(res.status, 422);
    })
    .chain(cleanup("test-6"))
    .toPromise());

test("add docs and query - no query", () =>
  setup("test-6")
    .chain(() => query("test-6")())
    .map((res) => {
      assert(!res.ok);
      assertEquals(res.msg, "query is required!");
      assertEquals(res.status, 422);
    })
    .chain(cleanup("test-6"))
    .toPromise());
