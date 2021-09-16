import { DB, path } from "./deps.js";
import dal from "./dal.js";
import sal from './sal.js'

import adapter from "./adapter.js";

export default function (config) {
  return ({
    id: "minisearch",
    port: "search",
    load: () => {
      const dir = config.dir || ".";
      const db = new DB(path.join(dir, "hyper-search.db"));

      window.addEventListener("unload", () => {
        if (db) {
          try {
            db.close(true);
          } catch (e) {
            console.log("ERROR CLOSING DB: ", e);
          }
        }
      });

      return ({db: dal(db), se: sal()});
    },
    link: (env) => () => adapter(env),
  });
}
