import time
from datetime import timedelta
from os import makedirs
from os.path import isfile, join
from textwrap import dedent

from airflow.providers.common.compat.sdk import TriggerRule
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import Asset, Variable, dag, task
from pendulum import datetime
from utils.wikidata import fetch_sparql, read_query, save_json

DEFAULT_DAYS_BEFORE_CLEANUP = 1
SLEEP_TIME_S = 10



def OwmfDownloadWikidataDAG(
    prefix: str,
    wikidata_country: str | None = None,
    days_before_cleanup: int = DEFAULT_DAYS_BEFORE_CLEANUP,
    **kwargs
):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework Wikidata download.

    Downloads the relevant linked entities from the Wikidata SPARQL endpoint and stores them
    as JSON pages in the shared `wikidata` directory, ready to be loaded into the DB by OwmfDbInitDAG.
    This download only depends on the configuration (not on the OSM data), so it runs in parallel
    with the OSM filtering (OwmfFilterDAG): both are triggered by the raw PBF asset.

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

    # The download does not use the PBF, but the raw PBF asset is used as the pipeline-start signal
    # so that the Wikidata download runs in parallel with the OSM filtering.
    pbf_path = f'/workdir/{prefix}/{prefix}.osm.pbf'
    pbf_asset = Asset(f'file://{pbf_path}')

    # Shared directory (NOT run-specific) where the downloaded Wikidata JSON pages are published.
    # OwmfDbInitDAG consumes this asset and loads the pages from here.
    wikidata_dir = join("/workdir", prefix, "wikidata")
    wikidata_asset = Asset(f'file://{wikidata_dir}')

    # Path to the temporary folder where the DAG will store the intermediate files
    workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

    @dag(
        start_date=start_date,
        catchup=False,
        schedule=[pbf_asset],
        tags=['owmf', prefix, 'owmf-download-wikidata', 'consumes', 'produces'],
        **kwargs
    )
    def owmf_download_wikidata():
        """
        # OSM-Wikidata Map Framework Wikidata download

        * downloads the relevant linked entities from Wikidata
        * publishes them as JSON pages for OwmfDbInitDAG to load into the DB

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
            * `osm_wikidata_properties` set => download direct related entities
            * `wikidata_indirect_property` set => download reverse related entities
            * neither => download generic entities

            Links:
            * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.16.0/_api/airflow/providers/standard/operators/python/index.html#airflow.providers.standard.operators.python.BranchPythonOperator)
            """
            direct_properties = Variable.get("osm_wikidata_properties", deserialize_json=True)
            indirect_property = Variable.get("wikidata_indirect_property")
            if direct_properties:
                next_task = "fetch_direct_entities"
            elif indirect_property:
                next_task = "fetch_reverse_entities"
            else:
                next_task = "fetch_base_entities"
            return next_task
        task_check_fetch = choose_fetch_wikidata_task()
        task_create_work_dir >> task_check_fetch

        @task
        def fetch_direct_entities(workdir_eval: str, wikidata_country_eval: str | None = None) -> None:
            """
            Callable that downloads Wikidata direct related entities
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

            for page_number in range(10):
                json_path = join(workdir_eval, f"{page_number}.json")
                if isfile(json_path):
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

                save_json(json_path, result)
                print(f"Loaded page {page_number}")
                time.sleep(SLEEP_TIME_S)

            print("Done loading direct related entities")
        task_fetch_direct = fetch_direct_entities(workdir, wikidata_country)
        task_check_fetch >> task_fetch_direct

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
            # Publish the downloaded Wikidata JSON pages

            Reset the shared `wikidata` directory and copy into it the JSON pages downloaded in this run,
            then emit the Wikidata asset that triggers OwmfDbInitDAG.
            """
            from glob import glob
            from os.path import basename
            from shutil import copyfile, rmtree

            rmtree(wikidata_dir, ignore_errors=True)
            makedirs(wikidata_dir, exist_ok=True)
            for json_path in sorted(glob(join(workdir_eval, "*.json"))):
                dest_path = join(wikidata_dir, basename(json_path))
                print(f"Copying {json_path} to {dest_path}")
                copyfile(json_path, dest_path)
        task_publish = publish_wikidata_asset(workdir)
        [task_fetch_direct, task_fetch_reverse, task_fetch_generic] >> task_publish

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
