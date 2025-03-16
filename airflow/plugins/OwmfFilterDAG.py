from os.path import dirname, abspath, join
from textwrap import dedent
from datetime import timedelta
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.utils.trigger_rule import TriggerRule
from airflow.sensors.time_delta import TimeDeltaSensorAsync
from OsmiumTagsFilterOperator import OsmiumTagsFilterOperator
from OsmiumExportOperator import OsmiumExportOperator

DEFAULT_DAYS_BEFORE_CLEANUP = 1

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)



def do_copy_file(source_path:str, dest_path:str) -> None:
    """
    Copy a file from one path to another
    """
    from shutil import copyfile
    copyfile(source_path, dest_path)

class OwmfFilterDAG(DAG):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework OSM data filtering.
    Triggered on the availability of the PBF file for the prefix.
    Filters the appropriate OSM data and exports it to a PG tab-separated-values file ready for importing into the DB.
    """

    def __init__(self,
            prefix:str=None,
            days_before_cleanup:int = DEFAULT_DAYS_BEFORE_CLEANUP,
            **kwargs
        ):
        """
        Apache Airflow DAG for OSM-Wikidata Map Framework OSM data filtering.

        Keyword arguments:
        ----------
        prefix: str
            prefix to search in the PBF filename 
        days_before_cleanup: int
            number of days to wait before cleaning up the DAG run temporary folder

        See https://airflow.apache.org/docs/apache-airflow/2.6.0/index.html
        """

        # https://airflow.apache.org/docs/apache-airflow/2.6.0/timezone.html
        # https://pendulum.eustace.io/docs/#instantiation
        start_date = datetime(year=2022, month=9, day=15, tz='local')

        if not prefix or prefix=="":
            raise Exception("Prefix must be specified")
        
        base_file_path = join('/workdir',prefix,prefix) # .osm.pbf / .osm.pbf.date.txt / ...
        
        pbf_path = f'{base_file_path}.osm.pbf'
        pbf_date_path = f'{base_file_path}.osm.pbf.date.txt'
        pbf_dataset = Dataset(f'file://{pbf_path}')

        filtered_pbf_path = f'{base_file_path}.filtered.osm.pbf'
        filtered_pbf_date_path = f'{base_file_path}.filtered.osm.pbf.date.txt'
        filtered_pbf_dataset = Dataset(f'file://{filtered_pbf_path}')

        pg_path = f'{base_file_path}.filtered.osm.pg'
        pg_date_path = f'{base_file_path}.filtered.osm.pg.date.txt'
        pg_dataset = Dataset(f'file://{pg_path}')
        
        workdir = join("/workdir",prefix,"{{ ti.dag_id }}","{{ ti.run_id }}")
        """Path to the temporary folder where the DAG will store the intermediate files"""

        super().__init__(
            start_date=start_date,
            catchup=False,
            schedule = [pbf_dataset],
            tags=['owmf', f'owmf-{prefix}', 'owmf-filter', 'consumes', 'produces'],
            doc_md = """
                # OSM-Wikidata Map Framework OSM data filtering

                * ingests downloaded OSM PBF data
                * filters OSM data to keep only relevant data

                Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
            """,
            **kwargs
        )

        task_create_work_dir = BashOperator(
            task_id = "create_work_dir",
            bash_command = 'mkdir -p "$workDir"',
            env = { "workDir": workdir, },
            dag = self,
        )

        task_keep_name = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_name",
            container_name = "airflow-keep_elements_with_name",
            source_path= pbf_path,
            dest_path = join(workdir,"with_name.osm.pbf"),
            tags='{{ var.json.osm_filter_tags|join(" ") }}',
            remove_tags= True,
            dag = self,
            doc_md = dedent("""
                # Keep only elements with a name

                Filter the OpenStreetMap PBF data to keep only elements which have a name.

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_create_work_dir >> task_keep_name

        task_keep_possible_ety = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_possible_etymology",
            container_name = "airflow-keep_elements_with_possible_etymology",
            source_path = join(workdir,"with_name.osm.pbf"),
            dest_path = join(workdir,"possible_etymology.osm.pbf"),
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
            remove_tags= True,
            dag = self,
            doc_md = dedent("""
                # Keep only elements that could have an etymology

                Filter the OpenStreetMap PBF data to keep only elements which could have an etymology:
                * elements with the etymology directly specified via the text, description and `*:wikidata` configured tags
                * elements that could have the etymology specified in the Wikidata entity linked by the tag `wikidata`
                * elements for which the etymology could be propagated from homonymous elements (to keep a reasonable computation time only some highways are kept for this purpose) 

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_keep_name >> task_keep_possible_ety

        # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md#excluded-elements
        task_remove_non_interesting = OsmiumTagsFilterOperator(
            task_id = "remove_non_interesting_elements",
            container_name = "airflow-remove_non_interesting_elements",
            source_path = join(workdir,"possible_etymology.osm.pbf"),
            dest_path = join(workdir,"filtered.osm.pbf"),
            tags=[
                'man_made=flagpole', # Flag poles
                'end_date=*', 'boundary=historic', 'boundary=disused', 'route=historic', # Items that don't exist anymore (troll tags)
                'wikidata=Q314003' # Wrong value for wikidata=* (stepping stone)
            ],
            invert_match= True,
            dag = self,
            doc_md = dedent("""
                # Remove non interesting elements

                Filter the OpenStreetMap PBF data to remove elements which are not interesting:
                * flagpoles (https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/5)
                * items with known wrong tags
                
                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_keep_possible_ety >> task_remove_non_interesting

        task_save_filtered_pbf_dataset = BashOperator(
            task_id = "save_filtered_pbf_dataset",
            bash_command = 'cp "$sourceFilePath" "$filteredPbfPath" && cp "$pbfDatePath" "$filteredPbfDatePath"',
            env = {
                "sourceFilePath": join(workdir,"filtered.osm.pbf"),
                "filteredPbfPath": filtered_pbf_path,
                "pbfDatePath": pbf_date_path,
                "filteredPbfDatePath": filtered_pbf_date_path,
            },
            outlets = filtered_pbf_dataset,
            dag = self
        )
        task_remove_non_interesting >> task_save_filtered_pbf_dataset

        task_copy_config = PythonOperator(
            task_id = "copy_osmium_export_config",
            python_callable = do_copy_file,
            op_kwargs = {
                "source_path": get_absolute_path("osmium.json"),
                "dest_path": join(workdir,"osmium.json"),
            },
            dag = self,
            doc_md="""
                # Copy the Osmium configuration

                Copy the configuration for `osmium export` ([osmium.json](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/airflow/dags/osmium.json)) into the working directory.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html)
            """
        )
        task_create_work_dir >> task_copy_config

        task_export_to_pg = OsmiumExportOperator(
            task_id = "osmium_export_pbf_to_pg",
            container_name = "airflow-osmium_export_pbf_to_pg",
            source_path = join(workdir,"filtered.osm.pbf"),
            dest_path = join(workdir,"filtered.osm.pg"),
            cache_path = f"/tmp/osmium_{prefix}_{{{{ ti.job_id }}}}",
            config_path = join(workdir,"osmium.json"),
            dag = self,
            doc_md=dedent("""
                # Export OSM data from PBF to PG

                Export the filtered OpenStreetMap data from the filtered PBF file to a PG tab-separated-values file ready for importing into the DB.

                Uses `osmium export` through `OsmiumExportOperator`:
            """) + dedent(OsmiumExportOperator.__doc__)
        )
        [task_remove_non_interesting,task_copy_config] >> task_export_to_pg

        task_save_pg_dataset = BashOperator(
            task_id = "save_pg_dataset",
            bash_command = 'mv "$sourceFilePath" "$pgPath" && cp "$filteredPbfDatePath" "$pgDatePath"',
            env = {
                "sourceFilePath": join(workdir,"filtered.osm.pg"),
                "pgPath": pg_path,
                "filteredPbfDatePath": filtered_pbf_date_path,
                "pgDatePath": pg_date_path,
            },
            outlets = pg_dataset,
            dag = self
        )
        task_export_to_pg >> task_save_pg_dataset

        task_wait_cleanup = TimeDeltaSensorAsync(
            task_id = 'wait_for_cleanup_time',
            delta = timedelta(days=days_before_cleanup),
            trigger_rule = TriggerRule.NONE_SKIPPED,
            dag = self,
            doc_md = """
                # Wait for the time to cleanup the temporary files

                Links:
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.6.0/templates-ref.html)
            """
        )
        task_export_to_pg >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workDir"',
            env = {
                "workDir": workdir,
            },
            dag = self,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_wait_cleanup >> task_cleanup