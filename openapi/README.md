# OpenAPI spec files

This folder contains the OpenAPI spec files to generate APIs through openapi-generator:

* [commons.yaml](./commons.yaml): Wikimedia Action API
  * No official spec is available, this is a custom spec
* [sparql.yaml](./sparql.yaml): SPARQL query API (Wikidata Query service, QLever API, ...)
  * No official spec is available, this is a custom spec
* [wikibase.json](./wikibase.json): Wikibase REST API for Wikidata
  * Documented [here](https://www.wikidata.org/wiki/Wikidata:REST_API) and [here](https://doc.wikimedia.org/Wikibase/master/php/repo_rest-api_README.html)
  * The official Swagger is [here](https://doc.wikimedia.org/Wikibase/master/js/rest-api/)
  * Official spec downloaded from https://www.wikidata.org/w/rest.php/wikibase/v0/openapi.json

To generate the code from these OpenAPI files, run from this folder
```bash
npm install
npm run generate
```
