# hyper-adapter-minisearch

[![nest badge](https://nest.land/badge.svg)](https://nest.land/package/hyper-adapter-minisearch)
[![current version](https://img.shields.io/github/tag/hyper63/hyper-adapter-minisearch)](https://github.com/hyper63/hyper-adapter-minisearch/tags/)
[![test status](https://github.com/hyper63/hyper-adapter-minisearch/workflows/.github/workflows/test.yml/badge.svg)](https://github.com/hyper63/hyper-adapter-minisearch/actions/workflows/test.yml)

This adapter is for the search port, and it implements an embedded search called
minisearch.

## How to use

See https://purple-elephants.surge.sh

## How to configure

```sh
npm install @hyper63/adapter-minisearch
```

```js
import minisearch from '@hyper63/adapter-minisearch'

export default {
  ...
  adapters: [
    ...
    { port: 'search', plugins: [minisearch()]}
  ]
}
```
