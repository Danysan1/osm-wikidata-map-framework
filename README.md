# Open Etymology Map
### OpenStreetMap+Wikidata based etymology map

This web app uses OpenStreetMap and Wikidata to show the etymology of places on the map.

By default the user language is used when fetching etymology details. You can force the another language by using `HOSTNAME/etymology/?lang=LANGUAGE_CODE`, for example https://www.dsantini.it/etymology/?lang=es-ES#11.7056,44.3577,17.1 uses `es-ES` to require data in spanish.

## Used technologies

- [OpenStreetMap](https://www.openstreetmap.org/about) and its [`name:etymology:wikidata`](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata) tag
- [Wikidata](https://www.wikidata.org/wiki/Wikidata:Introduction) and its [SPARQL Query Service](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs)

For more details see [CONTRIBUTING.md](CONTRIBUTING.md).

## Screenshots

| ![Cluster view](screenshots/clusters.jpeg) | ![Base view](screenshots/blue.jpeg) |
|-----|-----|
| ![Color by type](screenshots/by_type.jpeg) | ![Color by gender](screenshots/by_gender.jpeg) |
