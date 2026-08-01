# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The code in this folder defines the Apache Airflow data pipelines that are regularly run to download the latest OpenStreetMap data, load it on a PostGIS DB, get the linked entities from Wikidata, export the result to a PMTiles file to be used by the front-end and upload it to a AWS S3 bucket.

Each `db-init-*.py` file in the `dags/` folder defines the flow for an area of the world.
The flow for each area is split in several Airflow data pipelines (`DAG`s) that automatically run once enabled. DAGs are **chained through Airflow assets** (each DAG is `schedule`d on the asset(s) it consumes and declares the asset it produces via `outlets`), so they trigger each other in order.

The DAGs do NOT form a pure sequence but a diamond: the OSM side (dump download → filtering) and the Wikidata download run **independently**, then both feed the DB initialization. The Wikidata download is not tied to the OSM pipeline — it runs on its own **weekly** schedule — because it depends only on the configuration, not on the OSM data.

1. OSM dump download (`OsmPbfDownloadDAG`) — produces the raw `.osm.pbf` asset
   - This pipeline downloads a .pbf OpenStreetMap dump ([a local extract](https://download.geofabrik.de/) or [a full planet export](https://planet.openstreetmap.org/))
2. OSM dump filtering (`OwmfFilterDAG`) — consumes the `.osm.pbf` asset, produces the filtered `.pg` asset
   - This pipeline filters the downloaded OSM dump with [`osmium tags-filter`](https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html) to keep only potentially useful data
   - The filtered .pbf is also exported to a tab-separated-values file with [`osmium export`](https://docs.osmcode.org/osmium/latest/osmium-export.html)
3. Wikidata download (`OwmfDownloadWikidataDAG`) — runs on a **weekly** schedule (`schedule="@weekly"`, not asset-triggered), produces the `wikidata/` directory asset
   - This pipeline downloads the relevant linked entities from Wikidata and publishes them as CSV pages, in a common entity-link format (see `utils.wikidata.ENTITY_LINK_CSV_COLUMNS`), in the shared `/workdir/<prefix>/wikidata` directory
   - The download depends only on the configuration (properties + optional `wikidata_country`), NOT on the OSM data, which is why it runs on its own schedule instead of being triggered by the OSM pipeline. `wikidata_country` is a parameter of this DAG (see `db-init-*.py`)
   - The data is downloaded through DuckDB, querying the periodic GeoParquet dump from https://wikidata-geo-dumps.toolforge.org/ (only supports the subset of Wikidata properties available as columns in the dump; if a configured property isn't available, an error is returned)
   - Download logic lives in `dags/templates/OwmfDownloadWikidataDAG.py` (DuckDB query + CSV normalization, using `DuckDBHook` from `airflow-provider-duckdb` against the in-memory `duckdb_default` connection set up in `docker-compose.yml`) and `dags/utils/wikidata.py` (shared helpers)
4. Data elaboration + Tiles generation (`OwmfDbInitDAG`) — consumes BOTH the filtered `.pg` asset and the `wikidata/` asset, produces the tiles asset
   - This pipeline imports the filtered data into the DB (by default by loading the tab-separated-values file, but it can also be configured to load it from the filtered .pbf with [osm2pgsql](https://osm2pgsql.org/))
   - Then OSM linked entities are extracted from OSM data and the previously-downloaded Wikidata pages are loaded into the DB (`load_entities` in `dags/templates/OwmfDbInitDAG.py`)
   - If enabled, propagation is executed.
   - Then the data is exported to PMTiles through [ogr2ogr](https://gdal.org/en/stable/programs/ogr2ogr.html)+[tippecanoe](https://github.com/felt/tippecanoe).
5. Tiles/dataset upload (`OwmfUploadToAwsDAG`, optional) — consumes the tiles asset
   - If enabled, the tiles and dataset are uploaded to an S3 bucket

The DAG templates live in `dags/templates/`; each `db-init-*.py` file instantiates them for one area. Because `OwmfDbInitDAG` now waits on the `wikidata/` asset, every area MUST also instantiate `OwmfDownloadWikidataDAG`, otherwise DB init will never trigger.

## Common Commands
To run the database initialization:

1. make sure Docker Compose is installed
2. initialize `.env` from [`.env.example`](../.env.example) (`NEXT_PUBLIC_OWMF_source_presets` is not yet supported, currently tags and properties for the preset must be specified directly)
3. the first time run `docker compose --profile airflow-init up`, then for each sequent time start Apache Airflow with `docker compose up -d`
4. If you want to upload the tiles to an S3 bucket, [create an access key on AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html), configure it [in an Airflow AWS connection](http://localhost:8080/variable/list/) called `aws_s3` and configure the URI of the S3 bucket [in an Airflow variable](http://localhost:8080/connection/list/) called `<PREFIX>_base_s3_uri` (for example `planet_base_s3_uri`)
5. Enable all the DAG pipelines for the area you are interested in (for example `download-planet-from-rss`+`filter-planet`+`download-wikidata-planet`+`db-init-planet`). Remember to enable the `download-wikidata-*` DAG too, otherwise `db-init-*` will never trigger (it waits on the Wikidata asset).
6. The data for OSM-Wikidata Map Framework will be stored in the `owmf` schema of the DB you configured in `.env`

**IMPORTANT NOTE**: If you use the planet file I suggest to use a machine with 16GB of RAM (and a lot of patience, it will require more than 6 hours; use a local extract in development to use less RAM and time, for an example see [db-init-italy-nord-ovest.py](./dags/db-init-italy-nord-ovest.py)).

Tip: if you run the local development instance through `docker-compose` you can connect to the local DB ([configured by default in `.env`](../.env.example)) by using PGAdmin at http://localhost:8000 .
