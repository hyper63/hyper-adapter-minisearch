// data access layer

const store = `
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  type TEXT,
  doc TEXT,
  timestmp TEXT
)`;

// create index on type
const idx = `
CREATE INDEX IF NOT EXISTS type_idx ON docs ( type )
`;

const insert = "INSERT INTO docs (id, type, doc, timestmp) VALUES (?, ?, ?, ?)";
const update =
  "UPDATE docs set doc = ?, timestmp = ? WHERE id = ? and type = ?";
const remove = "DELETE FROM docs where id = ?";
const get = "SELECT doc FROM docs where id = ?";
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
          ])
        ),
    remove: (id) =>
      Promise.resolve(id)
        .then((id) => id ? id : Promise.reject({ error: "id is required!" }))
        .then((id) => db.query(remove, [id])),
    get: (id) =>
      Promise.resolve(id)
        .then((id) => id ? id : Promise.reject({ error: "id is required!" }))
        .then((id) => db.query(get, [id])),
    list: (type) =>
      Promise.resolve(type)
        .then((type) =>
          type ? type : Promise.reject({ error: "type is required!" })
        )
        .then(
          (type) => db.query(list, [type]).map(([doc]) => JSON.parse(doc))
            .map(v => (console.log(v), v))
        ),
  });
}
