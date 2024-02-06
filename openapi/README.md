# OpenAPI spec files

This folder contains the OpenAPI spec files to generate APIs through openapi-generator:

* [commons.yaml](./commons.yaml): Wikimedia Action API
  * No official spec is available, this is a custom spec
* [overpass.yaml](./overpass.yaml): Overpass API
  * No official spec is available, this is a custom spec
* [sparql.yaml](./sparql.yaml): SPARQL query API (Wikidata Query service, QLever API, ...)
  * No official spec is available, this is a custom spec
* [wikibase.json](./wikibase.json): Wikibase REST API for Wikidata
  * Documented [here](https://www.wikidata.org/wiki/Wikidata:REST_API)
  * The official Swagger is [here](https://doc.wikimedia.org/Wikibase/master/js/rest-api/)
  * The official spec behind that Swagger is not available, it must be generated with these steps:
    1. Clone [the Wikibase repo](https://gerrit.wikimedia.org/g/mediawiki/extensions/Wikibase) ([GitHub mirror](https://github.com/wikimedia/mediawiki-extensions-Wikibase))
    2. Execute the build:spec target in [/repo/rest-api/package.json](https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/extensions/Wikibase/+/refs/heads/master/repo/rest-api/package.json)
    3. Move the generated spec to this folder
    4. In order to correctly generate the API change OpenAPI version from 3.1.0 to 3.0.3 and replace inlined statement definitions with "$ref": "#/components/schemas/Statement"