<h1 align="center">hyper-adapter-minisearch</h1>
<p align="center">A Search port adapter that uses minisearch in the <a href="https://hyper.io/">hyper</a>  service framework</p>
</p>
<p align="center">
  <a href="https://nest.land/package/hyper-adapter-minisearch"><img src="https://nest.land/badge.svg" alt="Nest Badge" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-minisearch/actions/workflows/test-and-publish.yml"><img src="https://github.com/hyper63/hyper-adapter-minisearch/actions/workflows/test-and-publish.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/hyper63/hyper-adapter-minisearch/tags/"><img src="https://img.shields.io/github/tag/hyper63/hyper-adapter-minisearch" alt="Current Version" /></a>
</p>

---

## Table of Contents

- [Background](#background)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Features](#features)
- [Methods](#methods)
- [Contributing](#contributing)
- [License](#license)

## Background

[`Minisearch`](https://www.npmjs.com/package/minisearch) is a tiny but powerful in-memory fulltext
search engine written in JavaScript. It is respectful of resources, and it can comfortably run both
in Node and in the browser.

## Getting Started

```js
import { default as minisearch } from 'https://x.nest.land/hyper-adapter-minisearch@1.0.10/mod.js'

export default {
  app: opine,
  adapter: [
    {
      port: 'search',
      plugins: [minisearch({ dir: '/tmp' })],
    },
  ],
}
```

## Installation

This is a Deno module available to import from
[nest.land](https://nest.land/package/hyper-adapter-minisearch)

deps.js

```js
export { default as minisearch } from 'https://x.nest.land/hyper-adapter-minisearch@1.0.14/mod.js'
```

## Features

- create an index in Minisearch
- delete an index in Minisearch
- index a document using Minisearch
- retrieving an indexed document from Minisearch index
- update an indexed document in Minisearch index
- remove an indexed document from Minisearch index
- bulk operation to index multiple docs using Minisearch
- query an Minisearch index

## Methods

This adapter fully implements the Search port and can be used as the
[hyper Search service](https://docs.hyper.io/search-api) adapter

See the full port [here](https://nest.land/package/hyper-port-search)

## Contributing

Contributions are welcome! See the hyper
[contribution guide](https://docs.hyper.io/contributing-to-hyper)

## Testing

```
./scripts/test.sh
```

To lint, check formatting, and run unit tests

## License

Apache-2.0
