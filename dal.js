// data access layer

const store = `
CREATE TABLE IF NOT EXISTS docs (
  id TEXT,
  type TEXT,
  parent TEXT,
  doc TEXT,
  timestmp TEXT,
  PRIMARY KEY (type, parent, id)
)`;

// create index on type
const idx = `
CREATE INDEX IF NOT EXISTS type_idx ON docs ( type )
`;

const insert =
  "INSERT INTO docs (id, type, parent, doc, timestmp) VALUES (?, ?, ?, ?, ?)";
const update =
  "UPDATE docs set doc = ?, timestmp = ? WHERE id = ? and type = ? and parent = ?";
const remove = "DELETE FROM docs where id = ?";
const removeByParent = "DELETE FROM docs where parent = ?";
const get = "SELECT doc FROM docs where id = ? and type = ? and parent = ? ";
const list = "SELECT doc FROM docs where type = ?";

// lets create a nosql api
export default function (db) {
  // create table and index
  db.query(store);
  db.query(idx);

  return Object.freeze({
    post: (doc) =>
      Promise.resolve(doc)
        .then((doc) =>
          doc.id ? doc : Promise.reject({ error: "doc.id is required!" })
        )
        .then((doc) =>
          doc.type ? doc : Promise.reject({ error: "doc.type is required!" })
        )
        .then((doc) =>
          db.query(insert, [
            doc.id,
            doc.type,
            doc.parent,
            JSON.stringify(doc),
            new Date().toISOString(),
          ])
        ),
    put: (doc) =>
      Promise.resolve(doc)
        .then((doc) =>
          doc.id ? doc : Promise.reject({ error: "doc.id is required!" })
        )
        .then((doc) =>
          doc.type ? doc : Promise.reject({ error: "doc.type is required!" })
        )
        .then((doc) =>
          db.query(update, [
            JSON.stringify(doc),
            new Date().toISOString(),
            doc.id,
            doc.type,
            doc.parent,
          ])
        ),
    remove: (id) =>
      Promise.resolve(id)
        .then((id) => id ? id : Promise.reject({ error: "id is required!" }))
        .then((id) => db.query(remove, [id])),
    get: (id, type, parent) =>
      Promise.resolve({ id, type, parent })
        .then((ctx) =>
          ctx.id ? ctx : Promise.reject({ error: "id is required!" })
        )
        .then((ctx) =>
          ctx.type ? ctx : Promise.reject({ error: "type is required!" })
        )
        .then((ctx) =>
          ctx.parent ? ctx : Promise.reject({ error: "parent is required!" })
        )
        .then((ctx) => db.query(get, [ctx.id, ctx.type, ctx.parent]))
        .then((result) => result && result[0] ? JSON.parse(result[0]) : null),
    listByType: (type) =>
      Promise.resolve(type)
        .then((type) =>
          type ? type : Promise.reject({ error: "type is required!" })
        )
        .then(
          (type) =>
            db.query(list, [type]).map(([doc]) => JSON.parse(doc))
              .map((v) => (console.log(v), v)),
        ),
    removeByParent: (parent) =>
      Promise.resolve(parent)
        .then((parent) =>
          parent ? parent : Promise.reject({ error: "parent is required!" })
        )
        .then((parent) => db.query(removeByParent, [parent])),
  });
}
