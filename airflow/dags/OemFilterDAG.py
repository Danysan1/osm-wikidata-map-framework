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

class OemFilterDAG(DAG):
    def __init__(self,
            upload_db_conn_id:str=None,
            prefix:str=None,
            use_osm2pgsql:bool=False,
            days_before_cleanup:int=1,
            **kwargs
        ):
        """
        DAG for OSM-Wikidata Map Framework DB initialization

        Parameters:
        ----------
        prefix: str
            prefix to search in the PBF filename 
        use_osm2pgsql: bool
            use osm2pgsql instead of osmium export
        days_before_cleanup: int
            number of days to wait before cleaning up the DAG run temporary folder

        See https://airflow.apache.org/docs/apache-airflow/2.5.1/index.html
        """

        # https://airflow.apache.org/docs/apache-airflow/2.5.1/timezone.html
        # https://pendulum.eustace.io/docs/#instantiation
        start_date = datetime(year=2022, month=9, day=15, tz='local')

        if not prefix or prefix=="":
            raise Exception("Prefix must be specified")
        
        pbf_path = f'/workdir/{prefix}/{prefix}.osm.pbf'
        pbf_date_path = f'/workdir/{prefix}/{prefix}.osm.pbf.date.txt'
        pbf_dataset = Dataset(f'file://{pbf_path}')

        filtered_pbf_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf'
        filtered_pbf_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf.date.txt'
        filtered_pbf_dataset = Dataset(f'file://{filtered_pbf_path}')

        pg_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg'
        pg_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg.date.txt'
        pg_dataset = Dataset(f'file://{pg_path}')

        default_params={
            "prefix": prefix,
            "upload_db_conn_id": upload_db_conn_id,
            "use_osm2pgsql": use_osm2pgsql,
            "pg_path": pg_path,
        }

        super().__init__(
            start_date=start_date,
            catchup=False,
            schedule = [pbf_dataset],
            tags=['oem', f'oem-{prefix}', 'oem-filter', 'consumes', 'produces'],
            params=default_params,
            doc_md = """
                # OSM-Wikidata Map Framework OSM data filtering

                * downloads and and filters OSM data
                * downloads relevant OSM data
                * combines OSM and Wikidata data
                * uploads the output to the production DB.

                Documentation in the task descriptions and in the [project's CONTRIBUTIG.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md).
            """,
            **kwargs
        )

        task_create_work_dir = BashOperator(
            task_id = "create_work_dir",
            bash_command = 'mkdir -p "$workDir"',
            env = { "workDir": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}", },
            dag = self,
        )

        task_keep_name = OsmiumTagsFilterOperator(
            task_id = "keep_elements_with_name",
            container_name = "osm-wikidata-map-framework-keep_elements_with_name",
            source_path= pbf_path,
            dest_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/with_name.osm.pbf",
            tags=['{{ var.value.osm_filter_key }}'],
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
            container_name = "osm-wikidata-map-framework-keep_elements_with_possible_etymology",
            source_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/with_name.osm.pbf",
            dest_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/possible_etymology.osm.pbf",
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

        task_remove_non_interesting = OsmiumTagsFilterOperator(
            task_id = "remove_non_interesting_elements",
            container_name = "osm-wikidata-map-framework-remove_non_interesting_elements",
            source_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/possible_etymology.osm.pbf",
            dest_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/filtered.osm.pbf",
            tags=[
                'man_made=flagpole', # Flag poles
                'n/place=region','n/place=state','n/place=country','n/place=continent', # Label nodes
                'r/admin_level=5','r/admin_level=4','r/admin_level=3', # Region/province borders
                'r/admin_level=2', # Country borders
                'wikidata=Q314003' # Wrong value for wikidata=* (stepping stone)
            ],
            invert_match= True,
            dag = self,
            doc_md = dedent("""
                # Remove non iteresting elements

                Filter the OpenStreetMap PBF data to remove elements which are not interesting:
                * flagpoles (https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/issues/5)
                * nodes that represent the label for a continent (`place=continent`), a country (`place=country`), a state (`place=state`) or a region (`place=region`), which out of their context would not make sense on the map
                * element representing an area too big for visualization (`admin_level=2`, `admin_level=3` or `admin_level=4`)

                Uses `osmium tags-filter` through `OsmiumTagsFilterOperator`:
            """) + dedent(OsmiumTagsFilterOperator.__doc__)
        )
        task_keep_possible_ety >> task_remove_non_interesting

        task_save_filtered_pbf_dataset = BashOperator(
            task_id = "save_filtered_pbf_dataset",
            bash_command = 'cp "$sourceFilePath" "$filteredPbfPath" && cp "$pbfDatePath" "$filteredPbfDatePath"',
            env = {
                "sourceFilePath": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/filtered.osm.pbf",
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
                "dest_path": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/osmium.json",
            },
            dag = self,
            doc_md="""
                # Copy the Osmium configuration

                Copy the configuration for `osmium export` ([osmium.json](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/airflow/dags/osmium.json)) into the working directory.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/python.html)
            """
        )
        task_create_work_dir >> task_copy_config

        task_export_to_pg = OsmiumExportOperator(
            task_id = "osmium_export_pbf_to_pg",
            container_name = "osm-wikidata-map-framework-osmium_export_pbf_to_pg",
            source_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/filtered.osm.pbf",
            dest_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/filtered.osm.pg",
            cache_path = "/tmp/osmium_{{ params.prefix }}_{{ ti.job_id }}",
            config_path = "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/osmium.json",
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
                "sourceFilePath": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/filtered.osm.pg",
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
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.5.1/templates-ref.html)
            """
        )
        task_export_to_pg >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workDir"',
            env = {
                "workDir": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}",
            },
            dag = self,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_wait_cleanup >> task_cleanup