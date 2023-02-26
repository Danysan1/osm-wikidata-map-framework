# OSM-Wikidata Map Framework

Framework for creating interactive maps that shows details about map elements based on OpenStreetMap and Wikidata.

For an example of usage, check out the existing implementations:
* https://gitlab.com/openetymologymap/open-etymology-map

By default the user language is used when fetching etymology details.
You can force the another language by passing the [ISO-639 + ISO-3166 localization code](http://www.lingoes.net/en/translator/langcode.htm) to the `lang` parameter.
For example https://etymology.dsantini.it/?lang=es-ES passes `es-ES` to require data in spanish.

## Used technologies

- [OpenStreetMap](https://www.openstreetmap.org/about) and its [`name:etymology:wikidata`](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata), [`subject:wikidata`](https://wiki.openstreetmap.org/wiki/Key:subject) and [`buried:wikidata`](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_link) tags
- [Wikidata](https://www.wikidata.org/wiki/Wikidata:Introduction) and its [SPARQL Query Service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs)

For more details see [CONTRIBUTING.md](CONTRIBUTING.md).

## Screenshots
Detail view:
[![Detail view](images/blue.jpeg)](https://etymology.dsantini.it/#13.404,52.519,16.0,blue)

Color grouping by gender:
[![Color grouping by gender](images/by_gender.jpeg)](https://etymology.dsantini.it/#13.385,52.517,13.3,gender)

Color grouping by type:
[![Color grouping by type](images/by_type.jpeg)](https://etymology.dsantini.it/#13.385,52.517,13.3,type)

Cluster view:
[![Cluster view](images/clusters.jpeg)](https://etymology.dsantini.it/#6.460,50.839,6.0,blue)
