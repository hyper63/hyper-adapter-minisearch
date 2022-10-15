import hyper from "https://x.nest.land/hyper@3.3.0/mod.js";
import app from "https://x.nest.land/hyper-app-opine@2.2.0/mod.js";

import search from "../mod.js";

await hyper({
  app,
  adapters: [
    { port: "search", plugins: [search({ dir: "/tmp" })] },
  ],
});
