import { assert, assertEquals } from "./dev_deps.js";
import { crocks, DB } from "./deps.js";
import dal from "./dal.js";

import createAdapter from "./adapter.js";

const adapter = createAdapter(dal(new DB("./test.db")));

const test = Deno.test;
const { Async } = crocks;

const setup = () =>
  Async.fromPromise(adapter.createIndex.bind(adapter))({
    index: "default",
    mappings: {
      fields: ["title", "body"],
      storeFields: ["title", "body", "category"],
    },
  });

const cleanup = () =>
  Async.fromPromise(adapter.deleteIndex.bind(adapter))("default");

/*
test("create index", () =>
  setup()
    .map(res => assert(res.ok))
    .chain(cleanup)
    .toPromise()
);
*/

test("add search doc", () =>
  setup()
    .chain(() =>
      Async.fromPromise(adapter.indexDoc.bind(adapter))({
        index: "default",
        key: "1",
        doc: {
          id: "1",
          title: "Search is fun",
          body: "search body",
          category: "foo",
        },
      })
    )
    .map((res) => (assert(res.ok), res))
    .chain(cleanup)
    .toPromise());

/*
test("index doc", async () => {
  await adapter.createIndex({
    index: "default",
    mappings: {
      fields: ["title", "body"],
      storeFields: ["title", "body", "category"],
    },
  });

  const result = await adapter.indexDoc({
    index: "default",
    key: "1",
    doc: {
      id: "1",
      title: "Search is fun",
      body: "This is a search post about cool and exciting stuff",
      category: "search",
    },
  });

  assert(result.ok);

  // const getResult = await adapter.getDoc({ index: "default", key: "1" });
  // assert(getResult.ok);
  // assertEquals(getResult.doc.title, "Search is fun");

  // const updateResult = await adapter.updateDoc({
  //   index: "default",
  //   key: "1",
  //   doc: { id: "1", title: "Beep Boop", body: "Test", category: "search" },
  // });
  // assert(updateResult.ok);

  // const cleanUpDoc = await adapter.removeDoc({
  //   index: "default",
  //   key: "1",
  // });

  // const getResult2 = await adapter.getDoc({ index: "default", key: "1" });
  // assert(getResult2.ok);
  // assertEquals(getResult2.doc.title, "Beep Boop");

  // assert(cleanUpDoc.ok);
  // clean up
  const deleteResult = await adapter.deleteIndex("default");
  assert(deleteResult.ok);
});
*/
/*
Deno.test("get document", async () => {
  const result3 = await adapter.getDoc({
    index: "default",
    key: "1",
  });
  assertEquals(result3.key, "1");
});

Deno.test("update document", async () => {
  const result4 = await adapter.updateDoc({
    index: "default",
    key: "1",
    doc: {
      id: "1",
      title: "Search is cool",
      body: "This is a search post and it is fun",
      category: "search",
    },
  });
  const r = await adapter.getDoc({
    index: "default",
    key: "1",
  });
  assertEquals(r.doc.title, "Search is cool");
  assert(result4.ok);
});

Deno.test("query doc", async () => {
  const searchResults = await adapter.query({
    index: "default",
    q: { query: "Search is cool" },
  });

  assertEquals(searchResults.matches[0].id, "1");

  const searchResults2 = await adapter.query({
    index: "default",
    q: {
      query: "Search is cool",
      filter: { category: "search" },
    },
  });

  assertEquals(searchResults2.matches[0].id, "1", "found doc");
});

Deno.test("remove doc", async () => {
  const docDeleteResult = await adapter.removeDoc({
    index: "default",
    key: "1",
  });

  assert(docDeleteResult.ok);

  const deletedDoc = await adapter.getDoc({
    index: "default",
    key: "1",
  }).catch(() => null);

  assertEquals(deletedDoc, null);
});

Deno.test("delete index", async () => {
  const deleteResult = await adapter.deleteIndex("default");
  assert(deleteResult.ok);
});
*/
