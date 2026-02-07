from datetime import timedelta
from os import makedirs
from os.path import abspath, dirname, join
from textwrap import dedent

from airflow.datasets import Dataset
from airflow.providers.common.compat.sdk import TriggerRule
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import dag, task
from operators.OsmiumExportOperator import OsmiumExportOperator
from operators.OsmiumTagsFilterOperator import OsmiumTagsFilterOperator
from pendulum import datetime

DEFAULT_DAYS_BEFORE_CLEANUP = 1


def get_absolute_path(filename: str, folder: str | None = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)


def OwmfFilterDAG(
    prefix: str,
    days_before_cleanup: int = DEFAULT_DAYS_BEFORE_CLEANUP,
    **kwargs
):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework OSM data filtering.
    Triggered on the availability of the PBF file for the prefix.
    Filters the appropriate OSM data and exports it to a PG tab-separated-values file ready for importing into the DB.

    Keyword arguments:
    ----------
    prefix: str
        prefix to search in the PBF filename 
    days_before_cleanup: int
        number of days to wait before cleaning up the DAG run temporary folder

    """

    # https://airflow.apache.org/docs/apache-airflow/3.1.7/authoring-and-scheduling/timezone.html
    # https://pendulum.eustace.io/docs/#instantiation
    start_date = datetime(year=2022, month=9, day=15, tz='local')

    # .osm.pbf / .osm.pbf.date.txt / ...
    base_file_path = join('/workdir', prefix, prefix)

    pbf_path = f'{base_file_path}.osm.pbf'
    pbf_date_path = f'{base_file_path}.osm.pbf.date.txt'
    pbf_dataset = Dataset(f'file://{pbf_path}')

    filtered_pbf_path = f'{base_file_path}.filtered.osm.pbf'
    filtered_date_path = f'{base_file_path}.filtered.osm.pbf.date.txt'
    filtered_pbf_dataset = Dataset(f'file://{filtered_pbf_path}')

    pg_path = f'{base_file_path}.filtered.osm.pg'
    pg_date_path = f'{base_file_path}.filtered.osm.pg.date.txt'
    pg_dataset = Dataset(f'file://{pg_path}')

    # Path to the temporary folder where the DAG will store the intermediate files
    workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

    @dag(
        start_date=start_date,
        catchup=False,
        schedule=[pbf_dataset],
        tags=['owmf', prefix, 'owmf-filter', 'consumes', 'produces'],
        **kwargs
    )
    def owmf_filter():
        """
        # OSM-Wikidata Map Framework OSM data filtering

        * ingests downloaded OSM PBF data
        * filters OSM data to keep only relevant data

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

        task_keep_name = OsmiumTagsFilterOperator(
            task_id="keep_elements_with_name",
            container_name="airflow-keep_elements_with_name",
            source_path=pbf_path,
            dest_path=join(workdir, "with_name.osm.pbf"),
            tags='{{ var.json.osm_filter_tags|join(" ") }}',
            remove_tags=True,
            doc_md=dedent("""
                # Keep only elements with a name

                Filter the OpenStreetMap PBF data to keep only elements which have a name.

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__ or "")
        )
        task_create_work_dir >> task_keep_name

        task_keep_possible_ety = OsmiumTagsFilterOperator(
            task_id="keep_elements_with_possible_etymology",
            container_name="airflow-keep_elements_with_possible_etymology",
            source_path=join(workdir, "with_name.osm.pbf"),
            dest_path=join(workdir, "possible_etymology.osm.pbf"),
            tags=[
                'w/highway=residential',
                'w/highway=unclassified',
                'w/highway=tertiary',
                'w/highway=secondary',
                'w/highway=primary',
                'w/highway=living_street',
                'w/highway=trunk',
                'wikidata',
                'name:etymology:wikidata',
                'name:etymology',
                'subject:wikidata',
                'buried:wikidata',
            ],
            remove_tags=True,
            doc_md=dedent("""
                # Keep only elements that could have an etymology

                Filter the OpenStreetMap PBF data to keep only elements which could have an etymology:
                * elements with the etymology directly specified via the text, description and `*:wikidata` configured tags
                * elements that could have the etymology specified in the Wikidata entity linked by the tag `wikidata`
                * elements for which the etymology could be propagated from homonymous elements (to keep a reasonable computation time only some highways are kept for this purpose) 

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__ or "")
        )
        task_keep_name >> task_keep_possible_ety

        # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#excluded-elements
        task_remove_non_interesting = OsmiumTagsFilterOperator(
            task_id="remove_non_interesting_elements",
            container_name="airflow-remove_non_interesting_elements",
            source_path=join(workdir, "possible_etymology.osm.pbf"),
            dest_path=join(workdir, "filtered.osm.pbf"),
            tags=[
                'man_made=flagpole',  # Flag poles
                # Items that don't exist anymore (troll tags)
                'end_date=*', 'boundary=historic', 'boundary=disused', 'route=historic',
                # Wrong value for wikidata=* (stepping stone)
                'wikidata=Q314003'
            ],
            invert_match=True,
            doc_md=dedent("""
                # Remove non interesting elements

                Filter the OpenStreetMap PBF data to remove elements which are not interesting:
                * flagpoles (https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/5)
                * items with known wrong tags
                
                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__ or "")
        )
        task_keep_possible_ety >> task_remove_non_interesting

        @task(outlets=filtered_pbf_dataset)
        def copy_files(workdir_eval: str, filtered_pbf_path_eval: str, pbf_date_path_eval: str, filtered_date_path_eval: str) -> None:
            """
            # Copy some files to their position for the next steps

            * Copy the filtered osm.pbf file to its destination
            * Copy the date file to its destination
            * Copy the configuration for `osmium export` (osmium.json) into the working directory.
            """
            from shutil import copyfile

            source_filtered_path = join(workdir_eval, "filtered.osm.pbf")
            print(
                f"Copying {source_filtered_path} to {filtered_pbf_path_eval}")
            copyfile(source_filtered_path, filtered_pbf_path_eval)

            print(f"Copying {pbf_date_path_eval} to {filtered_date_path_eval}")
            copyfile(pbf_date_path_eval, filtered_date_path_eval)

            source_osmium_path = get_absolute_path("osmium.json")
            dest_osmium_path = join(workdir_eval, "osmium.json")
            print(f"Copying {source_osmium_path} to {dest_osmium_path}")
            copyfile(source_osmium_path, dest_osmium_path)
        task_copy_files = copy_files(
            workdir, filtered_pbf_path, pbf_date_path, filtered_date_path)
        task_remove_non_interesting >> task_copy_files

        task_export_to_pg = OsmiumExportOperator(
            task_id="osmium_export_pbf_to_pg",
            container_name="airflow-osmium_export_pbf_to_pg",
            source_path=join(workdir, "filtered.osm.pbf"),
            dest_path=join(workdir, "filtered.osm.pg"),
            cache_path=f"/tmp/osmium_{prefix}_{{{{ run_id }}}}",
            config_path=join(workdir, "osmium.json"),
            doc_md=dedent("""
                # Export OSM data from PBF to PG

                Export the filtered OpenStreetMap data from the filtered PBF file to a PG tab-separated-values file ready for importing into the DB.

                Uses `osmium export` through `OsmiumExportOperator`:
            """) + dedent(OsmiumExportOperator.__doc__ or "")
        )
        task_copy_files >> task_export_to_pg

        @task(outlets=pg_dataset)
        def save_pg_dataset(workdir_eval: str):
            """
            Move the filtered TSV .pg dataset to the destination folder
            """
            from shutil import copy, move
            move(join(workdir_eval, "filtered.osm.pg"), pg_path)
            copy(filtered_date_path, pg_date_path)
        task_export_to_pg >> save_pg_dataset(workdir)

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
        task_export_to_pg >> task_wait_cleanup

        @task
        def cleanup(workdir_eval: str) -> None:
            """
            # Cleanup the work directory

            Remove the DAG run folder
            """
            from shutil import rmtree
            print(f"Deleting {workdir_eval}")
            rmtree(workdir_eval)
        task_wait_cleanup >> cleanup(workdir)

    return owmf_filter()
