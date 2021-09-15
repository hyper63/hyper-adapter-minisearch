import { DB } from "./deps.js";
import dal from "./dal.js";
import adapter from "./adapter.js";

export default function (config) {
  return ({
    id: "minisearch",
    port: "search",
    load: () => {
      const dir = config.dir || ".";
      const db = new DB(`${dir}/hyper-search.db`);

      window.addEventListener("unload", () => {
        if (db) {
          try {
            db.close(true);
          } catch (e) {
            console.log("ERROR CLOSING DB: ", e);
          }
        }
      });

      return dal(db);
    },
    link: (db) => () => adapter(db),
  });
}
