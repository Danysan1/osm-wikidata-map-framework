import re
import time
from datetime import timedelta
from os import makedirs
from os.path import isfile, join

from airflow.providers.common.compat.sdk import TriggerRule
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import Asset, Param, Variable, dag, get_current_context, task
from pendulum import datetime
from utils.wikidata import (fetch_sparql, get_latest_wikidata_geo_parquet_url,
                            read_query, sparql_bindings_to_entity_link_rows,
                            write_entity_link_csv)

DEFAULT_DAYS_BEFORE_CLEANUP = 1
SLEEP_TIME_S = 10

DOWNLOAD_METHOD = "download_method"
DEFAULT_DOWNLOAD_METHOD = "duckdb"

Q_ID_RE = re.compile(r'^Q\d+$')
P_ID_RE = re.compile(r'^P\d+$')

LIST_COLUMN_TYPE = "VARCHAR[]"

# In-memory DuckDB connection (see AIRFLOW_CONN_DUCKDB_DEFAULT in docker-compose.yml)
DUCKDB_CONN_ID = "duckdb_default"


def OwmfDownloadWikidataDAG(
    prefix: str,
    wikidata_country: str | None = None,
    days_before_cleanup: int = DEFAULT_DAYS_BEFORE_CLEANUP,
    **kwargs
):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework Wikidata download.

    Downloads the relevant linked entities from Wikidata and stores them as CSV pages, in the
    common entity-link format described in `utils.wikidata.ENTITY_LINK_CSV_COLUMNS`, in the shared
    `wikidata` directory, ready to be loaded into the DB by OwmfDbInitDAG. This download only
    depends on the configuration (not on the OSM data), so instead of being tied to the OSM
    pipeline it runs on its own weekly schedule and publishes the Wikidata asset that triggers
    OwmfDbInitDAG.

    Keyword arguments:
    ----------
    prefix: str
        prefix to search in the PBF filename
    wikidata_country: str | None
        Wikidata Q-ID of the country to restrict the download to (e.g. "Q38" for Italy)
    days_before_cleanup: int
        number of days to wait before cleaning up the DAG run temporary folder
    """

    # https://airflow.apache.org/docs/apache-airflow/3.3.0/authoring-and-scheduling/timezone.html
    # https://pendulum.eustace.io/docs/#instantiation
    start_date = datetime(year=2022, month=9, day=15, tz='local')

    # Shared directory (NOT run-specific) where the downloaded Wikidata CSV pages are published.
    # OwmfDbInitDAG consumes this asset and loads the pages from here.
    wikidata_dir = join("/workdir", prefix, "wikidata")
    wikidata_asset = Asset(f'file://{wikidata_dir}')

    # Path to the temporary folder where the DAG will store the intermediate files
    workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

    default_params = {
        DOWNLOAD_METHOD: Param(type="string", enum=["duckdb", "sparql"], default=DEFAULT_DOWNLOAD_METHOD),
    }

    @dag(
        start_date=start_date,
        catchup=False,
        schedule="@weekly",
        tags=['owmf', prefix, 'owmf-download-wikidata', 'produces'],
        params=default_params,
        **kwargs
    )
    def owmf_download_wikidata():
        """
        # OSM-Wikidata Map Framework Wikidata download

        * downloads the relevant linked entities from Wikidata, either through DuckDB (default,
          querying the periodic GeoParquet dump from https://wikidata-geo-dumps.toolforge.org/) or,
          if the `download_method` DAG parameter is set to `sparql`, through the legacy Wikidata
          SPARQL query service
        * publishes them as CSV pages, in the common entity-link format, for OwmfDbInitDAG to load
          into the DB

        Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
        """

        @task
        def create_work_dir(workdir_eval: str) -> None:
            """
            Create the temporary working directory
            """
            print(f"Creating {workdir_eval}")
            makedirs(workdir_eval, exist_ok=True)
        task_create_work_dir = create_work_dir(workdir)

        @task.branch
        def choose_fetch_wikidata_task() -> str:
            """
            # Check whether and how to download data from Wikidata

            Depending on the configured Wikidata properties, choose which download task to run by returning the task_id/function name of the next task to run:
            * `osm_wikidata_properties` set => download direct related entities, either through DuckDB or through the legacy SPARQL query service depending on the `download_method` DAG parameter
            * `wikidata_indirect_property` set => download reverse related entities
            * neither => download generic entities

            Links:
            * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.16.0/_api/airflow/providers/standard/operators/python/index.html#airflow.providers.standard.operators.python.BranchPythonOperator)
            """
            context = get_current_context()
            params = context["params"] if "params" in context else {}

            direct_properties = Variable.get("osm_wikidata_properties", default=None, deserialize_json=True)
            indirect_property = Variable.get("wikidata_indirect_property", default=None)
            if direct_properties:
                download_method = params.get(DOWNLOAD_METHOD, DEFAULT_DOWNLOAD_METHOD)
                if download_method == "duckdb":
                    next_task = "fetch_direct_entities_duckdb"
                elif download_method == "sparql":
                    next_task = "fetch_direct_entities_sparql"
                else:
                    raise ValueError(f"Unknown {DOWNLOAD_METHOD}: '{download_method}'")
            elif indirect_property:
                next_task = "fetch_reverse_entities"
            else:
                next_task = "fetch_base_entities"
            print(f"direct_properties: {direct_properties}, indirect_property: {indirect_property} => next_task: {next_task}")
            return next_task
        task_check_fetch = choose_fetch_wikidata_task()
        task_create_work_dir >> task_check_fetch

        @task
        def fetch_direct_entities_duckdb(workdir_eval: str, wikidata_country_eval: str | None = None) -> None:
            """
            # Download Wikidata direct related entities through DuckDB

            Query the periodic Wikidata GeoParquet dump published at
            https://wikidata-geo-dumps.toolforge.org/ for the configured direct properties and
            write the result as a single CSV page, in the common entity-link format, ready to be
            loaded into PostGIS by OwmfDbInitDAG. Much faster and more reliable than the legacy
            SPARQL method, but only supports the (curated) subset of Wikidata properties available
            as columns in the dump: if a configured property isn't available, either remove it or
            switch the `download_method` DAG parameter to `sparql`.

            Query `parquet_url` for all entities that have a location and at least one of the configured
            direct `properties`, and write the results as a single CSV page (see
            `utils.wikidata.ENTITY_LINK_CSV_COLUMNS`) to `output_path`, ready to be loaded into PostGIS by
            `OwmfDbInitDAG`.
            """
            from duckdb_provider.hooks.duckdb_hook import DuckDBHook

            properties = Variable.get("osm_wikidata_properties", deserialize_json=True)
            if not properties or not isinstance(properties, list):
                raise ValueError(f"Invalid osm_wikidata_properties variable: {properties}")

            parquet_url = get_latest_wikidata_geo_parquet_url()
            output_path = join(workdir_eval, "0.csv")

            for prop in properties:
                if not P_ID_RE.match(prop):
                    raise ValueError(f"Invalid Wikidata property ID: '{prop}'")
            if wikidata_country is not None and not Q_ID_RE.match(wikidata_country):
                raise ValueError(f"Invalid Wikidata country Q-ID: '{wikidata_country}'")
        
            conn = DuckDBHook(duckdb_conn_id=DUCKDB_CONN_ID).get_conn()
            try:
                conn.execute("INSTALL httpfs; LOAD httpfs;")
                conn.execute("INSTALL spatial; LOAD spatial;")
        
                available_columns = {
                    row[0]: row[1]
                    for row in conn.execute(f"DESCRIBE SELECT * FROM '{parquet_url}' LIMIT 0").fetchall()
                }
                unavailable_properties = [
                    prop for prop in properties if available_columns.get(prop) != LIST_COLUMN_TYPE
                ]
                if unavailable_properties:
                    raise ValueError(
                        f"Properties {unavailable_properties} are not available as list columns in the "
                        f"Wikidata geo dump ({parquet_url}); available list columns are "
                        f"{sorted(col for col, t in available_columns.items() if t == LIST_COLUMN_TYPE)}. "
                        "Either remove the unavailable properties from 'osm_wikidata_properties' or set "
                        "the 'download_method' DAG parameter to 'sparql' to use the legacy method instead."
                    )
        
                country_filter = f"list_contains(P17, '{wikidata_country}')" if wikidata_country else "TRUE"
                # Tag each property's linked entities with the property they came from before merging all
                # of them into a single list, so that a single UNNEST performs the whole flattening and the
                # remote dump only needs to be scanned once no matter how many properties are configured.
                property_or_filter = " OR ".join(f"{prop} IS NOT NULL" for prop in properties)
                property_link_lists = ", ".join(
                    f"COALESCE(list_transform({prop}, lambda x: {{'v': x, 'p': '{prop}'}}), [])"
                    for prop in properties
                )
                query = f"""
                    SELECT id, name, name_en, P373, ST_AsText(geom) AS location, link.v AS linked_entity, link.p AS from_prop, NULL AS alias
                    FROM (
                        SELECT *, UNNEST(list_concat({property_link_lists})) AS link
                        FROM '{parquet_url}'
                        WHERE geom IS NOT NULL AND {country_filter} AND ({property_or_filter})
                    )
                """
        
                print(f"Querying {parquet_url} for properties {properties} (country filter: {country_filter})")
                conn.execute(f"COPY ({query}) TO '{output_path}' (FORMAT CSV, HEADER FALSE)")
            finally:
                conn.close()
        
            with open(output_path, "r", encoding="utf-8") as f:
                row_count = sum(1 for _ in f)
            print(f"Fetched {row_count} rows into {output_path}")

            print("Done downloading direct related entities through DuckDB")
        task_fetch_direct_duckdb = fetch_direct_entities_duckdb(workdir, wikidata_country)
        task_check_fetch >> task_fetch_direct_duckdb

        @task
        def fetch_direct_entities_sparql(workdir_eval: str, wikidata_country_eval: str | None = None) -> None:
            """
            # Download Wikidata direct related entities through the SPARQL query service (legacy)

            Callable that downloads Wikidata direct related entities from the Wikidata SPARQL
            query service, normalizing each downloaded page into the common entity-link CSV format
            (see utils.wikidata.ENTITY_LINK_CSV_COLUMNS) so that OwmfDbInitDAG can load it into the
            DB the same way regardless of the download method used.
            """

            # Read configuration
            properties = Variable.get("osm_wikidata_properties", deserialize_json=True)
            if not properties or not isinstance(properties, list):
                raise ValueError(f"Invalid osm_wikidata_properties variable: {properties}")

            # Read SPARQL template
            sparql_template = read_query("load-related-direct-map.sparql")

            # Build the SPARQL property values substitution
            direct_property_values = " ".join(f"(p:{p} ps:{p})" for p in properties)

            # Build country filter
            wikidata_country_query = f"?item wdt:P17 wd:{wikidata_country_eval}." if wikidata_country_eval else ""

            base_sparql = (
                sparql_template
                .replace("${directPropertyValues}", direct_property_values)
                .replace("${wikidataCountryQuery}", wikidata_country_query)
            )
            print(f"Using SPARQL query template:\n{base_sparql}")

            for page_number in range(10):
                csv_path = join(workdir_eval, f"{page_number}.csv")
                if isfile(csv_path):
                    print(f"Skipping page {page_number} (already downloaded)")
                    continue

                sparql_query = base_sparql.replace("${lastDigit}", str(page_number))
                print(f"Fetching page {page_number}...")

                try:
                    result = fetch_sparql(sparql_query)
                except Exception as e:
                    print(f"First attempt for page {page_number} failed, retrying...\n{e}")
                    time.sleep(SLEEP_TIME_S)
                    result = fetch_sparql(sparql_query)

                bindings = result.get("results", {}).get("bindings", [])
                print(f"Fetched {len(bindings)} rows for page {page_number}")

                rows = sparql_bindings_to_entity_link_rows(bindings)
                write_entity_link_csv(csv_path, rows)
                print(f"Loaded page {page_number} ({len(rows)} entity-link rows)")
                time.sleep(SLEEP_TIME_S)

            print("Done downloading direct related entities through SPARQL")
        task_fetch_direct_sparql = fetch_direct_entities_sparql(workdir, wikidata_country)
        task_check_fetch >> task_fetch_direct_sparql

        task_fetch_reverse = EmptyOperator(
            task_id="fetch_reverse_entities",
            doc_md="""
# Download Wikidata reverse related entities

# YET TO BE IMPLEMENTED
"""
        )
        task_check_fetch >> task_fetch_reverse

        task_fetch_generic = EmptyOperator(
            task_id="fetch_base_entities",
            doc_md="""
# Download Wikidata base entities

# YET TO BE IMPLEMENTED
"""
        )
        task_check_fetch >> task_fetch_generic

        @task(outlets=wikidata_asset, trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS)
        def publish_wikidata_asset(workdir_eval: str) -> None:
            """
            # Publish the downloaded Wikidata CSV pages

            Reset the shared `wikidata` directory and copy into it the CSV pages downloaded in this run,
            then emit the Wikidata asset that triggers OwmfDbInitDAG.
            """
            from glob import glob
            from os.path import basename
            from shutil import copyfile, rmtree

            rmtree(wikidata_dir, ignore_errors=True)
            makedirs(wikidata_dir, exist_ok=True)
            for csv_path in sorted(glob(join(workdir_eval, "*.csv"))):
                dest_path = join(wikidata_dir, basename(csv_path))
                print(f"Copying {csv_path} to {dest_path}")
                copyfile(csv_path, dest_path)
        task_publish = publish_wikidata_asset(workdir)
        [task_fetch_direct_duckdb, task_fetch_direct_sparql, task_fetch_reverse, task_fetch_generic] >> task_publish

        task_wait_cleanup = TimeDeltaSensor(
            task_id='wait_for_cleanup_time',
            delta=timedelta(days=days_before_cleanup),
            trigger_rule=TriggerRule.NONE_SKIPPED,
            deferrable=True,
            doc_md="""
# Wait for the time to cleanup the temporary files

Links:
* [TimeDeltaSensor documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.11.0/sensors/datetime.html)
"""
        )
        task_publish >> task_wait_cleanup

        @task
        def cleanup(workdir_eval: str) -> None:
            """
            # Cleanup the work directory

            Remove the DAG run folder
            """
            from shutil import rmtree
            print(f"Deleting {workdir_eval}")
            rmtree(workdir_eval, ignore_errors=True)
        task_wait_cleanup >> cleanup(workdir)

    return owmf_download_wikidata()
