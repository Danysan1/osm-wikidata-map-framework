# Contributing to Open Etymology Map

## How to contribute to the background map

The background maps are provided by Mapbox and Maptiler, which are based on OpenStreetMap. You can improve the map on [openstreetmap.org](https://www.openstreetmap.org/).
You can learn how to map on [the official welcome page](https://www.openstreetmap.org/welcome) and on [LearnOSM](https://learnosm.org/). Keep in mind that they doen't update the map immediately so if you edit something on OpenStreetMap it may take some time to appear in the map.

## How to report a problem in the etymology of an element

If the etymology associated to the element is correct but there is a problem in the details (birth date, nationality, ...):
1. From the etymology window click on the "Wikidata" button for the incorrect etymology
2. At the top of the opened page click on "Discussion"
3. Append in the opened text box the description of the problem you found in the data
4. Confirm your comment by clicking on the blue button below

If the problem is related to the etymology itself (a wrong etymology is associated to the element):
1. From the etymology window click on the "OpenStreetMap" button
2. On the left of the opened page check if the `name:etymology:wikidata`, `subject:wikidata` or `buried:wikidata` tag is present. If it is, click on the dialog button on the right to add a note to the map and describe the problem
3. If the tags above are absent, the `wikidata` tag will be present and its value will be clickable. Click on it.
   - If the opened page represents the element from the map (not its etymology, not something else), it should contain a "named after" or "dedicated to" relation to the wrong item:
      1. At the top of the opened page click on "Discussion"
      2. Append in the opened text box the description of the problem you found in the etymology for the item
      3. Confirm your comment by clicking on the blue button below
   - If instead the opened page represents something else, go back to the OpenStreetMap page, click on the button on the right to add a note to the map and write that the `wikidata` tag points to the wrong item

## How to contribute to the etymology data

Open Etymology Map gets the etymology of elements on the map from [OpenStreetMap](https://www.openstreetmap.org/welcome) and information about the etymology subjects from [Wikidata](https://www.wikidata.org/wiki/Wikidata:Introduction).

Some tools make it easy to contribute to OpenStreetMap by linking etymology data:

- https://mapcomplete.osm.be/etymology helps discovering missing `name:etymology:wikidata` tags and find their possible value
- https://osm.wikidata.link/ helps discovering missing `wikidata` tags and find their possible value

If those tools aren't enough for your needs and you want to manually add or correct the etymology of an element you can do it on [openstreetmap.org](https://www.openstreetmap.org/).
You can learn how to map on [the official welcome page](https://www.openstreetmap.org/welcome) and on [LearnOSM](https://learnosm.org/).

The wikidata ID of an item (object/person/...) can be found by searching its name on [wikidata.org](https://www.wikidata.org/wiki/Wikidata:Main_Page), once the subject will be opened its alphanumeric ID will be both on the right of the title and in the URL.
Suppose for example that you want to tag something named after Nelson Mandela: after searching it on wikidata you will find it's page at https://www.wikidata.org/wiki/Q8023 . As can be seen from the URL, it's ID is `Q8023`.

Open Etymology Map obtains the etymology data from multiple tags:

![Tags and properties used by Open Etymology Map](images/tags.svg)

Platform | Property/Key | Description | Other info
| ---- | ---- | ---- | ---- |
OpenStreetMap|`wikidata`|The ID of the Wikidata item about the feature (for example, Q9141 represents the way Taj Mahal). Only entries which are 'about the feature' should be linked.|[Documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata)
OpenStreetMap|`name:etymology:wikidata`|It contains the ID of the Wikidata item for the feature's namesake.|[Documentation](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata)
OpenStreetMap|`subject:wikidata`|It contains the ID of the Wikidata item for the event, person or thing that is memorialized in a monument/memorial|[Documentation](https://wiki.openstreetmap.org/wiki/Key:subject)
OpenStreetMap|`buried:wikidata`|It contains the ID of the Wikidata item for the person or animal that is buried in a grave/tomb|[Documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links)
Wikidata|`P138` ("named after")|Entity or event that inspired the subject's name, or namesake (in at least one language)|[Info](https://www.wikidata.org/wiki/Property:P138)
Wikidata|`P547` ("commemorates")|What the place, monument, memorial, or holiday, commemorates|[Info](https://www.wikidata.org/wiki/Property:P547)
Wikidata|`P825` ("dedicated to")|Person or organization to whom the subject was dedicated|[Info](https://www.wikidata.org/wiki/Property:P825)

In order to display the etymology of an element you need to create one of these combinations. Here's how to do it:

1. Find the element of interest on [OpenStreetMap](https://www.openstreetmap.org/)
2. Check out the element's tags:
    - If the element has a `name:etymology:wikidata`, `subject:wikidata` or `buried:wikidata` tag and two weeks have passed from their addition, then the element should already be available on Open Etymology Map.
        - If one of these tags is present and the time period has passed but the element isn't available on OEM, then the tag value may contain an error (like not being a valid Wikidata ID).
        - If one of these tags is available but liks to the wrong etymology/subject, search on Wikidata the ID for the correct etymology/subject and edit the incorrect tag with the new ID.
    - If the element has a `wikidata` tag check the referenced Wikidata element.
        - If it does not represent the same real world object of the OSM element, search the correct one and change it.
        - If it contains a `P138` ("named after"), `P547` ("commemorates") or `P825` ("dedicated to") relation check that it links to the correct etymology. If it is absent, add it:
            1. Click "+ Add statement"
            2. On the left choose `P138`, `P547` or `P825` (depending on which is more appropriate) as property
            3. On the right search the desired etymology to use as the value
    - If none of these tags is present, you can link the Wikidata item for the etymology to the element
        1. Search the etymology on Wikidata
        2. If the Wikidata element for the etymology is not available you can create it [on this Wikidata page](https://www.wikidata.org/wiki/Special:NewItem) using the instructions on that page.
        3. Add to the OpenStreetMap element the `name:etymology:wikidata`, `subject:wikidata` or `buried:wikidata` tag (depending on the meaning of the etymology) with the Wikidata ID as value. Using the example above, if you want to state an element is named after Nelson Mandela you will need to add the tag `name:etymology:wikidata`=`Q8023`.

## How to contribute to Open Etymology Map

Any suggestion to improve this documentation page is really appreciated, as it helps more newcomers to contribute to the map and more in general to the OSM and Wikidata projects. You can edit it and open a merge request or you can [open a new issue](https://gitlab.com/openetymologymap/open-etymology-map/-/issues/new) describing your suggestion.

You can find below some information useful to contribute to the Open Etymology Map codebase.

### Deployment

The production instance is https://etymology.dsantini.it .
During development you can run a local instance of Open Etymology Map using the [instructions you will find below](#local-development-with-docker).

#### Configuration

In order to make a deployed instance function correctly all instance settings must be set in `.env`.

You can copy the template file [`.env.example`](.env.example), you must set `mapbox_token` while other options should already be ok as a starting point.

If you want to use [Sentry](https://sentry.io/welcome/) you need to create a JS and/or PHP Sentry project and set the `sentry-*` parameters according with the values you can find in `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/keys/` and `https://sentry.io/settings/_ORGANIZATION_/projects/_PROJECT_/security-headers/csp/`.

#### Local development with Docker

A local development instance can be started with Docker by running `docker-compose --profile dev up` in the project root. This will start
- An instance of Open Etymology exposed at http://localhost:80
- A PostgreSQL+PostGIS DB exposed on `localhost:5432`
- A PGAdmin instance exposed at http://localhost:8080

<details>
<summary>Deployment diagram</summary>

![deployment diagram](images/dev.svg)

</details>

Visual Studio Code users [can use Dev Containers](https://code.visualstudio.com/docs/remote/containers) to develop directly inside the local development instance.

#### Production deployment with Docker

The latest version can be deployed through Docker using the image [`registry.gitlab.com/openetymologymap/open-etymology-map`](https://gitlab.com/openetymologymap/open-etymology-map/container_registry/3032190).

```sh
docker run --rm -d  -p 80:80/tcp registry.gitlab.com/openetymologymap/open-etymology-map:latest
```

This image can be built with:

```sh
docker build --pull --rm -f "Dockerfile" -t "open-etymology-map" --target "prod" .
```

A full installation without DB (using Overpass) can be deployed with docker-compose:

```sh
git clone https://gitlab.com/openetymologymap/open-etymology-map.git
cd open-etymology-map
cp ".env.example" ".env"
# At this point edit the file .env adding the correct mapbox_token
docker-compose --profile "prod" up -d
```

A full installation complete with DB can be deployed with docker-compose:

```sh
git clone https://gitlab.com/openetymologymap/open-etymology-map.git
cd open-etymology-map
cp ".env.example" ".env"
# At this point edit the file .env adding the correct mapbox_token and setting db_enable=true
docker-compose --profile "prod+db" up -d
# At this point you need to load a dump of the DB on the DB exposed on port 5432 
```

<details>
<summary>Deployment diagram</summary>

![deployment diagram](images/prod.svg)

![deployment diagram](images/prod+db.svg)

![deployment diagram](images/prod+promtail.svg)

</details>

### Structure

#### Front-end

The front-end is composed by [index.php](public/index.php), [style.css](src/style.css) and index.js (built from [index.ts](src/index.ts)).
The map is created using [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs) (a tentative implementation with its FOSS fork, [Maplibre GL JS](https://maplibre.org/maplibre-gl-js-docs/api/), is WIP with no ETA) and the charts are created using [chart.js](https://www.chartjs.org/).

At very low zoom level (zoom < [`min_zoom_level`](.env.example)), clustered element count is shown from [`global-map.php`](https://etymology.dsantini.it/global-map.php).

At low zoom level ([`threshold_zoom_level`](.env.example) > zoom > [`min_zoom_level`](.env.example)) clustered count is obtained from the back-end with [elements.php](public/elements.php).

At high enough zoom level (zoom > [`threshold_zoom_level`](.env.example)) actual elements and their etymologies are obtained from the back-end with [etymologyMap.php](public/etymologyMap.php) .

#### Back-end (v2, using PostGIS DB)

<details>
<summary>Deployment diagram</summary>

![deployment diagram](images/v2.svg)

</details>

An Apache Airflow pipeline defined in [db-init-planet.py](airflow/dags/db-init-planet.py) is regularly run to initialize the [PostgreSQL](https://www.postgresql.org/)+[PostGIS](https://postgis.net/) DB with the latest OpenStreetMap elements and their respective Wikidata etymology IDs.

Once the DB is initialized, this is the data gathering process in [etymologyMap.php](public/etymologyMap.php) used by in v2 if the configuration contains `db_enable = true`:

1. [`BBoxTextPostGISQuery::downloadMissingText()`](app/query/postgis/BBoxTextPostGISQuery.php) checks if the Wikidata content for the requested area has already been downloaded in the DB
    - If it has not been downloaded it downloads it downloads it using [EtymologyIDListJSONWikidataQuery](app/query/wikidata/EtymologyIDListJSONWikidataQuery.php) and loads it in the DB
2. [`BBoxEtymologyPostGISQuery`](app/query/postgis/BBoxEtymologyPostGISQuery.php) queries the DB and outputs the elements and their etymologies.

##### Database initialization

As mentioned above an Apache Airflow pipeline defined in [db-init-planet.py](airflow/dags/db-init-planet.py) is regularly run to initialize the [PostgreSQL](https://www.postgresql.org/)+[PostGIS](https://postgis.net/) DB with the latest OpenStreetMap elements and their respective wikidata etymology IDs.
This pipeline starts from a .pbf file ([a local extract](http://download.geofabrik.de/) in testing or [a full planet export](https://planet.openstreetmap.org/) in production), filters it with [osmium](https://osmcode.org/osmium-tool/) [`tags-filter`](https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html), exports it to a tab-separated-values file with [osmium](https://osmcode.org/osmium-tool/) [`export`](https://docs.osmcode.org/osmium/latest/osmium-export.html) and imports it into the DB. [osm2pgsql](https://osm2pgsql.org/) is also supported in place of `osmium export` but the former is typically used.

To run the database initialization:
1. make sure [`docker-compose` is installed](#local-development-with-docker)
2. initialize `.env` from [`.env.example`](.env.example) as shown [above](#configuration)
3. start Apache Airflow with `docker-compose --profile airflow up -d`
4. from the Apache Airflow configuration menu in the dashboard located at http://localhost:8080 create the Pool `data_filtering`
5. run/enable an existing DAG pipeline (if necessary customising the launch config)
6. the data for Open Etymology Map will be stored in the `oem` schema of the DB you configured in `.env` (and, if specified in the destination DB)

IMPORTANT NOTE: If you use the planet file I suggest to use a machine with 16GB of RAM (and a lot of patience, it will require more than 6 hours; use a local extract in development to use less RAM and time, for an example see [db-init-italy-nord-ovest.py](airflow/dags/db-init-italy-nord-ovest.py)).

Tip: if you run the local development instance through `docker-compose` you can connect to the local DB ([configured by default in `.env`](.env.example)) by using PGAdmin at http://localhost:8000 .

<details>
<summary>Database initialization steps diagram</summary>

![diagram](images/db-init.svg)

</details>

##### Propagation

If launched with the `--propagate-nearby` or `--propagate-global` flag the database initializaion also loads all ways with `highway=residential` or `highway=unclassified`.

With `--propagate-nearby` after elaborating the etymologies the system also propagates them to nearby homonimous roads (more specifically, [roads which intersect any road with an existing etymology](airflow/dags/sql/propagate-etymologies-nearby.sql)).

With `--propagate-global` after elaborating the etymologies the system also propagates them to all homonimous highways (to prevent bad propagations, [if a name is used in multiple roads with different etymology that name is not propagated](airflow/dags/sql/propagate-etymologies-global.sql)).

#### Old back-end (v1, using Overpass)

<details>
<summary>Deployment diagram</summary>

![deployment diagram](images/v1.svg)

</details>

Data gathering process in [etymologyMap.php](public/etymologyMap.php) used by in v1 (and in v2 if the configuration contains `db_enable = false`):

1. Check if the GeoJSON result for the requested area has already been cached recently.
   - If it is, serve the cached result ([CSVCachedBBoxGeoJSONQuery](app/query/caching/CSVCachedBBoxGeoJSONQuery.php)).
   - Otherwise it is necessary to fetch the data from OpenStreetMap through [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API).
      1. Query Overpass API in the selected area to get elements with etymology ([`BBoxEtymologyOverpassQuery`](app/query/overpass/BBoxEtymologyOverpassQuery.php)).
      2. Transform the JSON result into GeoJSON ([`OverpassEtymologyQueryResult`](app/result/overpass/OverpassEtymologyQueryResult.php)).
      3. Obtain a set of Wikidata IDs to get information about ([`GeoJSON2XMLEtymologyWikidataQuery`](app/query/wikidata/GeoJSON2XMLEtymologyWikidataQuery.php)).
      4. Check if the XML result for the requested set of Wikidata IDs has already been cached recently.
         - If it is, use the cached result ([`CSVCachedStringSetXMLQuery`](app/query/caching/CSVCachedStringSetXMLQuery.php)).
         - Otherwise it is necessary to fetch the data from OpenStreetMap.
            1. Query the Wikidata SPARQL query service to get information on the elements whose IDs are in the set obtained from OSM ([`EtymologyIDListXMLWikidataQuery`](app/query/wikidata/EtymologyIDListXMLWikidataQuery.php)).
            2. Cache the XML result ([`CSVCachedStringSetXMLQuery`](app/query/caching/CSVCachedStringSetXMLQuery.php)).
      5. Obtain from the XML result from Wikidata a matrix of details for each element ([`XMLWikidataEtymologyQueryResult`](app/result/wikidata/XMLWikidataEtymologyQueryResult.php)).
      6. Match each element in the GeoJSON data with an etymology with its details from Wikidata ([`GeoJSON2GeoJSONEtymologyWikidataQuery`](app/query/wikidata/GeoJSON2GeoJSONEtymologyWikidataQuery.php)).
      7. Cache the GeoJSON result ([`CSVCachedBBoxGeoJSONQuery`](app/query/caching/CSVCachedBBoxGeoJSONQuery.php)).

#### Output
The output of [etymologyMap.php](public/etymologyMap.php) is GeoJSON, the content of the properties for each element is defined in the interfaces [`FeatureProperties`](src/FeatureElement.ts#L7), [`Etymology`](src/EtymologyElement.ts#L4) and [`ImageResponse`](src/ImageElement.ts#L3).

The content of the output of [stats.php](public/stats.php) is defined in the [`EtymologyStat`](src/EtymologyColorControl.ts#L47) interface.
