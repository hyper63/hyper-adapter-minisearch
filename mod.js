import { DB } from "./deps.js";
import dal from "./dal.js";
import adapter from "./adapter.js";

export default function (config) {
  return ({
    id: "minisearch",
    port: "search",
    load: () => {
      const dir = config.dir || ".";
      let db = new DB(`${dir}/hyper-search.db`);
      let dataAccess = dal(db);

      window.addEventListener("unload", () => {
        if (db) {
          try {
            db.close(true);
          } catch (e) {
            console.log("ERROR CLOSING DB: ", e);
          }
        }
      });

      return dataAccess;
    },
    link: (db) => () => adapter(db),
  });
}
