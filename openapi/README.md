# OpenAPI spec files

This folder contains the OpenAPI spec files to generate APIs through openapi-generator:

* [commons.yaml](./commons.yaml): Wikimedia Action API
  * No official spec is available, this is a custom spec
* [sparql.yaml](./sparql.yaml): SPARQL query API (Wikidata Query service, QLever API, ...)
  * No official spec is available, this is a custom spec

To generate the code from these OpenAPI files, run from this folder
```bash
npm install
npm run generate
```
