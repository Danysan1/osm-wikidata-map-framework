# Contributing to Open Etymology Map

## Contributing to the background map

The background map is provided by Mapbox, which is itself based on OpenStreetMap. You can improve the map on [openstreetmap.org](https://www.openstreetmap.org/).
You can learn how to map on [the official welcome page](https://www.openstreetmap.org/welcome) and on [LearnOSM](https://learnosm.org/).

## Contributing to the etymology data

Open Etymology Map gets the etymology of elements on the map from OpenStreetMap and information about the etymology subjects from Wikidata.

If you wish to add or correct the etymology for an element for the map you can do it on [openstreetmap.org](https://www.openstreetmap.org/).
You can learn how to map on [the official welcome page](https://www.openstreetmap.org/welcome) and on [LearnOSM](https://learnosm.org/).

Once you find the element of interest on OpenStreetMap you can edit it's etymology by adding/changing the value for the [`name:etymology:wikidata`](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata) or [`subject:wikidata`](https://wiki.openstreetmap.org/wiki/Key:subject) tag to the Wikidata ID of the subject which inspired the name of the map element.

The wikidata ID of the etymology can be found by searching the name of the subject on [wikidata.org](https://www.wikidata.org/wiki/Wikidata:Main_Page), once the subject will be opened its alphanumeric ID will be both on the right of the title and in the URL.

Suppose for example that you want to tag something named after Nelson Mandela: after searching it on wikidata you will find it's page at https://www.wikidata.org/wiki/Q8023 . As can be seen from the URL, it's ID is `Q8023`. You will then need to add the tag `name:etymology:wikidata`=`Q8023` to the map element.

## Contributing to this project

You can find here some information useful to contribute to the Open Etymology Map project.

### Deployment

The default production instance is https://etymology.dsantini.it and the development instance is https://etymology-test.dsantini.it .

#### Configuration

In order to make a deployed instance function correctly all instance settings must be set in `open-etymology-map.ini`.

A template for this config file can be found in [`open-etymology-map.template.ini`](open-etymology-map.template.ini). When copying the template `.ini` you must set `mapbox-gl-token`, while other options should already be ok as a starting point.

If you want to use [Sentry](https://sentry.io/welcome/) you need to create a JS and/or PHP Sentry project and set the `sentry-*` parameters according with the values you can find in `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/keys/` and `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/security-headers/csp/`.
If you enable Sentry JS on the frontend remember to add `www.google.*` and `inline` in your project's settings `Security Headers` > `CSP Instructions` (`https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/security-headers/csp/`) > `Additional ignored sources` or you will quickly burn through your quota because of irrelevant CSP messages.

#### Local development with Docker

A local development instance can be started with Docker by running `docker-compose up` in the project root and browsing to http://localhost/ .
Visual Studio Code users [can use Dev Containers](https://code.visualstudio.com/docs/remote/containers) to develop directly inside the local development instance.

#### Production deployment with Docker

The latest version can be deployed through Docker using the image `registry.gitlab.com/dsantini/open-etymology-map` whose available tags are listed [here](https://gitlab.com/dsantini/open-etymology-map/container_registry/2165364).

```sh
docker run --rm -d  -p 80:80/tcp registry.gitlab.com/dsantini/open-etymology-map:latest
```

This image can be built with:

```sh
docker build --pull --rm -f "Dockerfile" -t "open-etymology-map" --target "prod" .
```

### Front-end

[index.php](web/index.php) and [index.js](web/index.js) create the map with Mapbox GL JS.
Etymology data is obtained from the back-end with [elements.php](web/elements.php) (when [`threshold-zoom-level`](open-etymology-map.template.ini) > zoom > [`min-zoom-level`](open-etymology-map.template.ini)) and [etymologyMap.php](web/etymologyMap.php) (when zoom > [`threshold-zoom-level`](open-etymology-map.template.ini)).

### Back-end

Data gathering process in [etymologyMap.php](web/etymologyMap.php):

1. Check if the GeoJSON result for the requested area has already been cached recently.
   - If it is, serve the cached result ([CSVCachedBBoxGeoJSONQuery](web/app/query/cache/CSVCachedBBoxGeoJSONQuery.php)).
   - Otherwise it is necessary to fetch the data from OpenStreetMap through Overpass.
      1. Query Overpass API in the selected area to get elements with etymology ([BBoxEtymologyOverpassQuery](web/app/query/overpass/BBoxEtymologyOverpassQuery.php)).
      2. Transform the JSON result into GeoJSON ([OverpassEtymologyQueryResult](web/app/result/overpass/OverpassEtymologyQueryResult.php)).
      3. Obtain a set of Wikidata IDs to get information about ([GeoJSON2XMLEtymologyWikidataQuery](web/app/query/wikidata/GeoJSON2XMLEtymologyWikidataQuery.php)).
      4. Check if the XML result for the requested set of Wikidata IDs has already been cached recently.
         - If it is, use the cached result ([CSVCachedStringSetXMLQuery](web/app/query/cache/CSVCachedStringSetXMLQuery.php)).
         - Otherwise it is necessary to fetch the data from OpenStreetMap.
            1. Query the Wikidata SPARQL query service to get information on the elements whose IDs are in the set obtained from OSM ([EtymologyIDListXMLWikidataQuery](web/app/query/wikidata/EtymologyIDListXMLWikidataQuery.php)).
            2. Cache the XML result ([CSVCachedStringSetXMLQuery](web/app/query/cache/CSVCachedStringSetXMLQuery.php)).
      5. Obtain from the XML result from Wikidata a matrix of details for each element ([XMLWikidataEtymologyQueryResult](web/app/result/wikidata/XMLWikidataEtymologyQueryResult.php)).
      6. Match each element in the GeoJSON data with an etymology with its details from Wikidata ([GeoJSON2GeoJSONEtymologyWikidataQuery](web/app/query/wikidata/GeoJSON2GeoJSONEtymologyWikidataQuery.php)).
      7. Cache the GeoJSON result ([CSVCachedBBoxGeoJSONQuery](web/app/query/cache/CSVCachedBBoxGeoJSONQuery.php)).

The result will be something similar to
```json
{
    "type": "FeatureCollection",
    "features": [
        ...
        
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [
                    22.54163,
                    51.24552
                ]
            },
            "properties": {
                "name": "Pomnik Marii Curie-Sk\u0142odowskiej",
                "@id": "node\/3005524964",
                "wikipedia": "en:Marie Curie Monument in Lublin",
                "etymologies": [
                    {
                        "wikidata": "http:\/\/www.wikidata.org\/entity\/Q7186",
                        "wikipedia": "https:\/\/en.wikipedia.org\/wiki\/Marie_Curie",
                        "commons": "Marie Curie",
                        "name": "Marie Curie",
                        "description": "Polish-French physicist and chemist (1867-1934)",
                        "instanceID": "http:\/\/www.wikidata.org\/entity\/Q5",
                        "gender": "female",
                        "genderID": "http:\/\/www.wikidata.org\/entity\/Q6581072",
                        "occupations": "nuclear physicist, university teacher, chemist, physicist",
                        "pictures": [
                            "http:\/\/commons.wikimedia.org\/wiki\/Special:FilePath\/Marie%20Curie%20c.%201920s.jpg"
                        ],
                        "event_date": null,
                        "start_date": null,
                        "end_date": null,
                        "birth_date": "1867-11-07T00:00:00Z",
                        "death_date": "1934-07-04T00:00:00Z",
                        "event_place": null,
                        "birth_place": "Warsaw",
                        "death_place": "Sancellemoz",
                        "prizes": "Nobel Prize in Physics, Nobel Prize in Chemistry",
                        "citizenship": "Poland, France, Russian Empire",
                        "wkt_coords": null
                    }
                ]
            }
        },
        ...
        {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [
                        11.7023,
                        44.36173
                    ],
                    [
                        11.70262,
                        44.36161
                    ],
                    [
                        11.70271,
                        44.36158
                    ],
                    [
                        11.70334,
                        44.36134
                    ]
                ]
            },
            "properties": {
                "name": "Via Caduti di Cefalonia",
                "@id": "way\/22877448",
                "etymologies": [
                    {
                        "wikidata": "http:\/\/www.wikidata.org\/entity\/Q537576",
                        "wikipedia": "https:\/\/en.wikipedia.org\/wiki\/Massacre_of_the_Acqui_Division",
                        "commons": "Massacre of the Acqui Division",
                        "name": "massacre of the Acqui Division",
                        "description": "1943 mass execution of Italian soldiers",
                        "instanceID": "http:\/\/www.wikidata.org\/entity\/Q135010",
                        "gender": null,
                        "genderID": null,
                        "occupations": null,
                        "pictures": [
                            "http:\/\/commons.wikimedia.org\/wiki\/Special:FilePath\/Argostoli%20mnimeio%20Italon.JPG"
                        ],
                        "event_date": "1943-09-26T00:00:00Z",
                        "start_date": "1943-09-21T00:00:00Z",
                        "end_date": "1943-09-26T00:00:00Z",
                        "birth_date": null,
                        "death_date": null,
                        "event_place": "Kefalonia",
                        "birth_place": null,
                        "death_place": null,
                        "prizes": null,
                        "citizenship": null,
                        "wkt_coords": "Point(20.59 38.25)"
                    }
                ]
            }
        },
        ...
    ]
}
```
