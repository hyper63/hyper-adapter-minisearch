import { default as appExpress } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper-app-express%40v1.1.0/packages/app-express/mod.ts'
import { default as core } from 'https://raw.githubusercontent.com/hyper63/hyper/hyper%40v4.1.0/packages/core/mod.ts'

import search from '../mod.js'

await core({
  app: appExpress,
  adapters: [
    { port: 'search', plugins: [search({ dir: '/tmp' })] },
  ],
})
