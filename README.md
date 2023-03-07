# OSM-Wikidata Map Framework

Framework for creating interactive maps that shows details about map elements based on OpenStreetMap and Wikidata.

For an example of usage, check out the existing implementations:

- [Open Etymology Map](https://gitlab.com/openetymologymap/open-etymology-map)
- [Open Burial Map](https://gitlab.com/openetymologymap/open-burial-map)

By default the user language is used when fetching etymology details.
You can force the another language by passing the [ISO-639 + ISO-3166 localization code](http://www.lingoes.net/en/translator/langcode.htm) to the `lang` parameter.
For example https://etymology.dsantini.it/?lang=es-ES passes `es-ES` to require data in spanish.

## Available data source patterns

| Data source pattern                                                                                                                                                                                                                                                                                                                                                                                                                                | Image                                                                                | ID (from DB)                        | ID (from APIs) | Configuration keys                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- | -------------- | ------------------------------------------- |
| [OpenStreetMap](https://www.openstreetmap.org/about) and its [`*:wikidata` tags](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links) (for example [`name:etymology:wikidata`](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata), [`subject:wikidata`](https://wiki.openstreetmap.org/wiki/Key:subject), [`buried:wikidata`](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links), ...) | ![OpenStreetMap name:etymology:wikidata pattern](images/data/osm_name_etymology.png) | `osm_*` (e.g. `osm_name_etymology`) | `overpass`     | `osm_filter_key`, `osm_wikidata_keys`       |
| OpenStreetMap [`wikidata`](https://wiki.openstreetmap.org/wiki/Key:wikidata) tag combined with [Wikidata](https://www.wikidata.org/wiki/Wikidata:Introduction) properties (like [`P138` ("named after")](https://www.wikidata.org/wiki/Property:P138), [`P547` ("commemorates")](https://www.wikidata.org/wiki/Property:P547), [`P825` ("dedicated to")](https://www.wikidata.org/wiki/Property:P825), ...)                                        | ![OpenStreetMap wikidata pattern](images/data/osm_wikidata.png)                      | `osm_wikidata`                      | :x:            | `osm_filter_key`, `osm_wikidata_properties` |
| Case insensitive search of names used by multiple roads far from each other which have exactly and only the same etymology (obtained from the sources above) and propagation of that etymology to all elements with the same name                                                                                                                                                                                                                  | ![Propagation image](images/data/propagation.png)                                    | `propagated`                        | :x:            | `osm_filter_key`, `propagate_data`          |
| Propagation of etymolgies to entities which are part of the original group etymology (e.g. married couple, couple of brothers, ...)                                                                                                                                                                                                                                                                                                                | ![Parts propagation image](images/data/part_of.png)                                  | Inherits the ID                     | :x:            |                                             |
| All sources listed above                                                                                                                                                                                                                                                                                                                                                                                                                           |                                                                                      | `all_db`                            | :x:            |
| Wikidata entities with the property [`P625` ("coordinate location")](https://www.wikidata.org/wiki/Property:P625) and one of the properties seen above                                                                                                                                                                                                                                                                                             | ![Wikidata direct relation image](images/data/wd_direct.png)                         | :x:                                 | `wd_direct`    | `osm_wikidata_properties`                   |
| Wikidata entities with the property `P625` referenced by an etymology entity with reverse properties (like [`P119` ("place of burial")](https://www.wikidata.org/wiki/Property:P119), ...)                                                                                                                                                                                                                                                         | ![Wikidata reverse relation image](images/data/wd_reverse.png)                       | :x:                                 | `wd_reverse`   | `wikidata_indirect_property`                |
| Wikidata property `P625` used as qualifier for reverse properties (like `P119`, ...)                                                                                                                                                                                                                                                                                                                                                               | ![Wikidata qualifier relation image](images/data/wd_qualifier.png)                   | :x:                                 | `wd_qualifier` | `wikidata_indirect_property`                |

For more details see [CONTRIBUTING.md](CONTRIBUTING.md).

## Technologies used for data elaboration and display

- [Wikidata SPARQL Query Service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Wikimedia REST API](https://en.wikipedia.org/api/rest_v1/)
- Python + [Apache Airflow](https://airflow.apache.org/)
- PHP + PostGIS
- Typescript + [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs)

## Screenshots

Detail view:
[![Detail view](images/blue.jpeg)](https://etymology.dsantini.it/#13.404,52.519,16.0,blue)

Color grouping by gender:
[![Color grouping by gender](images/by_gender.jpeg)](https://etymology.dsantini.it/#13.385,52.517,13.3,gender)

Color grouping by type:
[![Color grouping by type](images/by_type.jpeg)](https://etymology.dsantini.it/#13.385,52.517,13.3,type)

Cluster view:
[![Cluster view](images/clusters.jpeg)](https://etymology.dsantini.it/#6.460,50.839,6.0,blue)
