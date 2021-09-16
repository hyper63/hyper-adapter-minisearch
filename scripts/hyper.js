import hyper from "https://x.nest.land/hyper@1.4.9/mod.js";
import app from "https://x.nest.land/hyper-app-opine@1.2.4/mod.js";

import search from "../mod.js";

await hyper({
  app,
  adapters: [
    { port: "search", plugins: [search({ dir: "/tmp" })] },
  ],
});
