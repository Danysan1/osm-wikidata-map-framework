# Contributing to Open Etymology Map

You can find here some information useful to contribute to the project.

## Deployment

### Default instances

The default production instance ( https://www.dsantini.it/etymology/ ) and development instance ( https://www.dsantini.it/etymology-test/ ) are deployed semi-automatically through Gitlab CI and FTP (see https://gitlab.com/dsantini/open-etymology-map/-/environments ).

### Configuration

In order to make a deployed instance function correctly all instance settings must be set in `open-etymology-map.ini`. A template for this config file can be found in  [open-etymology-map.template.ini](open-etymology-map.template.ini).

### Local development with Docker

A local development instance can be started with Docker by running `docker-compose up` in the project root and browsing to http://localhost/ .
Visual Studio Code users [can use Dev Containers](https://code.visualstudio.com/docs/remote/containers) to develop directly inside the local development instance.

### Production deployment with Docker

The latest version can be deployed through Docker using the image `registry.gitlab.com/dsantini/open-etymology-map` whose available tags are listed [here](https://gitlab.com/dsantini/open-etymology-map/container_registry/2165364).

```sh
docker run --rm -d  -p 80:80/tcp registry.gitlab.com/dsantini/open-etymology-map:latest
```

This image can be built with:

```sh
docker build --pull --rm -f "Dockerfile" -t "open-etymology-map" --target "prod" .
```

## Front-end

[index.php](web/index.php) and [index.js](web/index.js) create the map with Mapbox GL JS.
Etymology data is obtained from the back-end with [overpass.php](web/overpass.php) (when [`threshold-zoom-level`](open-etymology-map.template.ini) > zoom > [`min-zoom-level`](open-etymology-map.template.ini)) and [etymologyMap.php](web/etymologyMap.php) (when zoom > [`threshold-zoom-level`](open-etymology-map.template.ini)).

## Back-end

Data gathering process in [etymologyMap.php](web/etymologyMap.php):

1. Check if the GeoJSON result for the requested area has already been cached recently.
   - If it is, serve the cached result ([CachedBBoxGeoJSONQuery](web/app/query/decorators/CachedBBoxGeoJSONQuery.php)).
   - Otherwise it is necessary to fetch the data from OpenStreetMap through Overpass.
      1. Query Overpass API in the selected area to get elements with etymology ([BBoxEtymologyOverpassQuery](web/app/query/overpass/BBoxEtymologyOverpassQuery.php)).
      2. Transform the JSON result into GeoJSON ([OverpassEtymologyQueryResult](web/app/result/overpass/OverpassEtymologyQueryResult.php)).
      3. Obtain a set of Wikidata IDs to get information about ([GeoJSONInputEtymologyWikidataQuery](web/app/query/wikidata/GeoJSONInputEtymologyWikidataQuery.php)).
      4. Check if the XML result for the requested set of Wikidata IDs has already been cached recently.
         - If it is, use the cached result ([CachedStringSetXMLQuery](web/app/query/decorators/CachedStringSetXMLQuery.php)).
         - Otherwise it is necessary to fetch the data from OpenStreetMap.
            1. Query the Wikidata SPARQL query service to get information on the elements whose IDs are in the set obtained from OSM ([EtymologyIDListWikidataQuery](web/app/query/wikidata/EtymologyIDListWikidataQuery.php)).
            2. Cache the XML result ([CachedStringSetXMLQuery](web/app/query/decorators/CachedStringSetXMLQuery.php)).
      5. Obtain from the XML result from Wikidata a matrix of details for each element ([WikidataEtymologyQueryResult](web/app/result/wikidata/WikidataEtymologyQueryResult.php)).
      6. Match each element in the GeoJSON data with an etymology with its details from Wikidata ([GeoJSONEtymologyWikidataQuery](web/app/query/wikidata/GeoJSONEtymologyWikidataQuery.php)).
      7. Cache the GeoJSON result ([CachedBBoxGeoJSONQuery](web/app/query/decorators/CachedBBoxGeoJSONQuery.php)).

The result will be something similar to
```json
{
    "type": "FeatureCollection",
    "features": [
        ...
        
        {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [
                            11.70551,
                            44.359059999999999
                        ],
                        [
                            11.70576,
                            44.359389999999998
                        ],
                        [
                            11.70614,
                            44.35924
                        ],
                        [
                            11.70589,
                            44.358910000000002
                        ],
                        [
                            11.70551,
                            44.359059999999999
                        ]
                    ]
                ]
            },
            "properties": {
                "name": "Area verde Rita Levi Montalcini",
                "@id": "way\/32464519",
                "etymologies": [
                    {
                        "wikidata": "http:\/\/www.wikidata.org\/entity\/Q185007",
                        "wikipedia": "https:\/\/en.wikipedia.org\/wiki\/Rita_Levi-Montalcini",
                        "commons": "Rita Levi-Montalcini",
                        "name": "Rita Levi-Montalcini",
                        "description": "Italian neurologist",
                        "instanceID": "http:\/\/www.wikidata.org\/entity\/Q5",
                        "gender": "female",
                        "genderID": "http:\/\/www.wikidata.org\/entity\/Q6581072",
                        "occupations": "neuroscientist, biochemist, neurologist, politician, physician, scientist",
                        "pictures": [
                            "http:\/\/commons.wikimedia.org\/wiki\/Special:FilePath\/Rita%20Levi%20Montalcini.jpg"
                        ],
                        "event_date": null,
                        "start_date": null,
                        "end_date": null,
                        "birth_date": "1909-04-22T00:00:00Z",
                        "death_date": "2012-12-30T00:00:00Z",
                        "event_place": null,
                        "birth_place": "Turin",
                        "death_place": "Rome",
                        "prizes": "Nobel Prize in Physiology or Medicine",
                        "citizenship": "United States of America, Italy, Kingdom of Italy"
                    }
                ]
            }
        }

        ...
    ]
}
```
