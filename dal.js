// data access layer

const store = `
CREATE TABLE IF NOT EXISTS docs (
  id TEXT,
  type TEXT,
  parent TEXT,
  doc TEXT,
  ts TEXT,
  PRIMARY KEY (type, parent, id)
)`;

// create index on type
const idx = `
CREATE INDEX IF NOT EXISTS type_idx ON docs ( type )
`;

const insert =
  "INSERT INTO docs (id, type, parent, doc, ts) VALUES (?, ?, ?, ?, ?)";
const update =
  "UPDATE docs set doc = ?, ts = ? WHERE id = ? and type = ? and parent = ?";
const remove = "DELETE FROM docs where type = ? AND parent = ? AND id = ?";
const removeByParent = "DELETE FROM docs where type = 'doc' AND parent = ?";
const get = "SELECT doc FROM docs where id = ? and type = ? and parent = ? ";
const list = "SELECT parent, doc FROM docs where type = ?";

// lets create a nosql api
export default function (db) {
  // create table and index
  db.query(store);
  db.query(idx);

  return Object.freeze({
    post: ({ id, type, parent, doc }) =>
      Promise.resolve(
        db.query(insert, [
          id,
          type,
          parent,
          JSON.stringify(doc),
          new Date().toISOString(),
        ]),
      ),
    put: ({ id, type, parent, doc }) =>
      Promise.resolve(
        db.query(update, [
          JSON.stringify(doc),
          new Date().toISOString(),
          id,
          type,
          parent,
        ]),
      ),
    remove: ({ id, type, parent }) =>
      Promise.resolve(db.query(remove, [type, parent, id])),
    get: ({ id, type, parent }) =>
      Promise.resolve({ id, type, parent })
        .then((ctx) => db.query(get, [ctx.id, ctx.type, ctx.parent]))
        .then((result) => result && result[0] ? JSON.parse(result[0]) : null),
    listByType: (type) =>
      Promise.resolve(type)
        .then(
          (type) =>
            db.query(list, [type]).map(([parent, doc]) => ({
              parent: parent,
              doc: JSON.parse(doc),
            }))
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
