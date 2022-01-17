import hyper from "https://x.nest.land/hyper@2.0.0/mod.js";
import app from "https://x.nest.land/hyper-app-opine@1.2.7/mod.js";

import search from "../mod.js";

await hyper({
  app,
  adapters: [
    { port: "search", plugins: [search({ dir: "/tmp" })] },
  ],
});
