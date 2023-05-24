import { DB, path } from './deps.js'
import dal from './dal.js'
import sal from './sal.js'

import adapter from './adapter.js'

export default function (config = { dir: '.' }) {
  return ({
    id: 'minisearch',
    port: 'search',
    load: () => {
      const db = new DB(path.join(config.dir, 'hyper-search.db'))

      self.addEventListener('unload', () => {
        console.log('closing search db')
        if (db) {
          try {
            db.close(true)
          } catch (e) {
            console.log('ERROR CLOSING DB: ', e)
          }
        }
      })

      return ({ db: dal(db), se: sal() })
    },
    link: (env) => () => adapter(env),
  })
}
