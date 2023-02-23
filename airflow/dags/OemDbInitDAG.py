from os.path import dirname, abspath, join
from textwrap import dedent
from datetime import timedelta
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.models.taskinstance import TaskInstance
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule
from airflow.utils.task_group import TaskGroup
from airflow.utils.edgemodifier import Label
from airflow.sensors.time_delta import TimeDeltaSensorAsync
from Osm2pgsqlOperator import Osm2pgsqlOperator
from OemDockerOperator import OemDockerOperator

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)

def do_postgres_copy(postgres_conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list) -> None:
    """
    Copy data from a CSV/TSV/... file to a PostgreSQL table

    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_from
    See https://github.com/psycopg/psycopg2/issues/1294
    """
    pg_hook = PostgresHook(postgres_conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath) as file:
                cursor.execute(f'SET search_path TO {schema}')
                cursor.copy_from(file, table, separator, columns = columns)
            print("Inserted rows:", cursor.rowcount)

def check_postgre_conn_id(conn_id:str) -> bool:
    """
        # Check upload DB connecton ID

        Check whether the connecton ID to the destination PostGIS DB is available: if it is, proceed to restore the data, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/concepts/params.html)
    """
    connection_is_ok = False
    if not conn_id:
        print("Empty conn_id")
    else:
        pg_hook = PostgresHook(conn_id)
        with pg_hook.get_conn() as pg_conn:
            with pg_conn.cursor() as cursor:
                cursor.execute("SELECT PostGIS_Version()")
                postgis_version = cursor.fetchone()
                connection_is_ok = True
                print(f"conn_id available, PostGIS version {postgis_version}")

    return connection_is_ok

def choose_load_osm_data_task(**context) -> str:
    """
        # Check how to load data into the DB

        Check whether to load the OSM data from the filtered PBF file through `osmium export` or through `osm2pgsql`.
        Unless the `use_osm2pgsql` parameter is present and True, `osmium export` is choosen by default.
        This choice is due to the facts that
        * loading with `osmium export` is split in two parts (conversion with `osmium export` from PBF to PG tab-separated-values which takes most of the time and loading with Postgres `COPY` which is fast), so if something goes wrong during loading or downstream it's faster to fix the problem and load again from the PG file
        * loading with `osmium export`+`COPY` is faster than loading `osm2pgsql`

        The `use_osm2pgsql` parameter is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/concepts/params.html)
    """
    p = context["params"]
    use_osm2pgsql = "use_osm2pgsql" in p and p["use_osm2pgsql"]
    return "load_elements_with_osm2pgsql" if use_osm2pgsql else "load_elements_from_pg_file"

class OemDbInitDAG(DAG):
    def __init__(self,
            local_db_conn_id:str="local_oem_postgres",
            upload_db_conn_id:str=None,
            prefix:str=None,
            use_osm2pgsql:bool=False,
            days_before_cleanup:int=1,
            **kwargs
        ):
        """
        DAG for Open Etymology Map DB initialization

        Parameters:
        ----------
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
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

        doc_md="""
            # Open Etymology Map DB initialization

            * downloads and and filters OSM data
            * downloads relevant OSM data
            * combines OSM and Wikidata data
            * uploads the output to the production DB.

            Documentation in the task descriptions and in the [project's CONTRIBUTIG.md](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/CONTRIBUTING.md).
        """

        if not prefix or prefix=="":
            raise Exception("Prefix must be specified")
        
        filtered_pbf_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf'
        filtered_pbf_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf.date.txt'
        pg_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg'
        pg_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg.date.txt'
        pg_dataset = Dataset(f'file://{pg_path}')

        default_params={
            "prefix": prefix,
            #"upload_db_conn_id": upload_db_conn_id,
            "use_osm2pgsql": use_osm2pgsql,
            "drop_temporary_tables": True,
        }

        super().__init__(
            start_date=start_date,
            catchup=False,
            schedule = [pg_dataset],
            tags=['oem', f'oem-{prefix}', 'oem-db-init', 'consumes'],
            params=default_params,
            doc_md = doc_md,
            **kwargs
        )

        db_prepare_group = TaskGroup("prepare_db", tooltip="Prepare the DB", dag=self)

        task_create_work_dir = BashOperator(
            task_id = "create_work_dir",
            bash_command = 'mkdir -p "$workDir"',
            env = { "workDir": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}", },
            dag = self,
        )
        
        task_setup_db_ext = SQLExecuteQueryOperator(
            task_id = "setup_db_extensions",
            conn_id = local_db_conn_id,
            sql = "sql/setup-db-extensions.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the necessary extensions on the local DB

                Setup PostGIS and HSTORE on the local Postgres DB if they are not already set up.
            """
        )

        task_teardown_schema = SQLExecuteQueryOperator(
            task_id = "teardown_schema",
            conn_id = local_db_conn_id,
            sql = "sql/teardown-schema.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Teardown the oem DB schema

                Reset the oem (Open Etymology Map) schema on the local PostGIS DB to start from scratch.
            """
        )
        task_setup_db_ext >> task_teardown_schema

        task_setup_schema = SQLExecuteQueryOperator(
            task_id = "setup_schema",
            conn_id = local_db_conn_id,
            sql = "sql/setup-schema.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the oem DB schema

                Setup the oem (Open Etymology Map) schema on the local PostGIS DB.
            """
        )
        task_teardown_schema >> task_setup_schema

        group_db_load = TaskGroup("load_data_on_db", prefix_group_id=False, tooltip="Load the data on the DB", dag=self)

        task_osmium_or_osm2pgsql = BranchPythonOperator(
            task_id = "choose_load_osm_data_method",
            python_callable= choose_load_osm_data_task,
            dag = self,
            task_group=group_db_load,
            doc_md = choose_load_osm_data_task.__doc__
        )

        task_load_ele_pg = PythonOperator(
            task_id = "load_elements_from_pg_file",
            python_callable = do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": local_db_conn_id,
                "filepath": pg_path,
                "separator": '\t',
                "schema": 'oem',
                "table": 'osmdata',
                "columns": ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"],
            },
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Load OSM data from the PG file

                Load the filtered OpenStreetMap data from the PG tab-separated-values file to the `osmdata` table of the local PostGIS DB.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/python.html)
            """
        )
        [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_pg

        task_load_ele_osm2pgsql = Osm2pgsqlOperator(
            task_id = "load_elements_with_osm2pgsql",
            container_name = "open-etymology-map-load_elements_with_osm2pgsql",
            postgres_conn_id = local_db_conn_id,
            source_path = filtered_pbf_path,
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Load OSM data from the PBF file

                Using `osm2pgsql`, load the filtered OpenStreetMap data directly from the PBF file.
            """
        )
        [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_osm2pgsql

        task_convert_osm2pgsql = SQLExecuteQueryOperator(
            task_id = "convert_osm2pgsql_data",
            conn_id = local_db_conn_id,
            sql = "sql/convert-osm2pgsql-data.sql",
            dag = self,
            task_group=group_db_load,
            doc_md = """
                # Prepare osm2pgsql data for usage

                Convert OSM data loaded on the local PostGIS DB from `osm2pgsql`'s `planet_osm_*` tables to the standard `osmdata` table.
            """
        )
        task_load_ele_osm2pgsql >> task_convert_osm2pgsql

        join_post_load_ele = EmptyOperator(
            task_id = "join_post_load_ele",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching done to choose between `osmium export` and `osm2pgsql`.
            """
        )
        [task_load_ele_pg, task_convert_osm2pgsql] >> join_post_load_ele

        elaborate_group = TaskGroup("elaborate_data", tooltip="Elaborate data inside the DB", dag=self)

        task_remove_ele_too_big = SQLExecuteQueryOperator(
            task_id = "remove_elements_too_big",
            conn_id = local_db_conn_id,
            sql = "sql/remove-elements-too-big.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove remaining non interesting elements

                Remove from the local PostGIS DB elements that aren't interesting and that it wasn't possible to remove during the filtering phase:
                * elements too big that wouldn't be visible anyway on the map 
                * elements that have a wrong etymology (name:etymology:wikidata and wikidata values are equal)
            """
        )
        join_post_load_ele >> task_remove_ele_too_big

        task_convert_ele_wd_cods = SQLExecuteQueryOperator(
            task_id = "convert_element_wikidata_cods",
            conn_id = local_db_conn_id,
            sql = "sql/convert-element-wikidata-cods.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert OSM - Wikidata associations

                Fill the element_wikidata_cods table with OSM element <-> Wikidata Q-ID ("code") associations obtained from OSM elements, specifying for each association the source (`wikidata` / `subject:wikidata` / `buried:wikidata` / `name:etymology:wikidata`).
                
                Links:
                * [`wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata)
                * [`subject:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:subject)
                * [`buried:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links)
                * [`name:etymology:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:name:etymology:wikidata)
            """
        )
        task_remove_ele_too_big >> task_convert_ele_wd_cods

        wikidata_init_file_path = get_absolute_path('wikidata_init.csv')
        task_load_wd_ent = PythonOperator(
            task_id = "load_wikidata_entities",
            python_callable = do_postgres_copy,
            op_kwargs = {
                "postgres_conn_id": local_db_conn_id,
                "filepath": wikidata_init_file_path,
                "separator": ',',
                "schema": 'oem',
                "table": 'wikidata',
                "columns": ["wd_wikidata_cod","wd_notes","wd_gender_descr","wd_gender_color","wd_type_descr","wd_type_color"],
            },
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Load default Wikidata entities

                Load into the `wikidata` table of the local PostGIS DB the default Wikidata entities (which either represent a gender or a type) from [wikidata_init.csv](https://gitlab.com/openetymologymap/open-etymology-map/-/blob/main/airflow/dags/wikidata_init.csv).

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/python.html)
            """
        )
        task_setup_schema >> task_load_wd_ent

        task_convert_wd_ent = SQLExecuteQueryOperator(
            task_id = "convert_wikidata_entities",
            conn_id = local_db_conn_id,
            sql = "sql/convert-wikidata-entities.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Load Wikidata entities from OSM etymologies

                Load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are etymologies from OSM (values from `subject:wikidata`, `buried:wikidata` or `name:etymology:wikidata`).
            """
        )
        [task_convert_ele_wd_cods, task_load_wd_ent] >> task_convert_wd_ent

        task_convert_ety = SQLExecuteQueryOperator(
            task_id = "convert_etymologies",
            conn_id = local_db_conn_id,
            sql = "sql/convert-etymologies.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert the etymologies

                Fill the `etymology` table of the local PostGIS DB elaborated the etymologies from the `element_wikidata_cods` table.
            """
        )
        task_convert_wd_ent >> task_convert_ety

        task_load_named_after = OemDockerOperator(
            task_id = "download_named_after_wikidata_entities",
            container_name = "open-etymology-map-download_named_after_wikidata_entities",
            command = "php app/loadWikidataNamedAfterEntities.php",
            postgres_conn_id = local_db_conn_id,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata 'named after' entities

                For each existing Wikidata entity representing an OSM element:
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
                * load into the `wikidata_named_after` table of the local PostGIS DB the 'named after' relationships
                
                Uses the Wikidata SPARQL query service through `OemDockerOperator`:
            """) + dedent(OemDockerOperator.__doc__)
        )
        task_convert_ety >> task_load_named_after

        # TODO check wether to propagate (env var propagate_data) 

        task_propagate = SQLExecuteQueryOperator(
            task_id = "propagate_etymologies_globally",
            conn_id = local_db_conn_id,
            sql = "sql/propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Propagate the etymologies

                Check the reliable etymologies (where multiple case-insensitive homonymous elements have etymologies to the exactly the same Wikidata entity).
                Then propagate reliable etymologies to case-insensitive homonymous elements that don't have any etymology.
            """
        )
        task_load_named_after >> task_propagate
        
        task_load_parts = OemDockerOperator(
            task_id = "download_parts_of_wikidata_entities",
            container_name = "open-etymology-map-download_parts_of_wikidata_entities",
            command = "php app/loadWikidataPartsOfEntities.php",
            postgres_conn_id = local_db_conn_id,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata parts of entities

                For each existing Wikidata entity representing the etymology for and OSM element:
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are part of the entity
                * load into the `etymology` table of the local PostGIS DB the entity parts as etymology for the elements for which the container is an etymology
                
                Uses the Wikidata SPARQL query service through `OemDockerOperator`:
            """) + dedent(OemDockerOperator.__doc__)
        )
        task_propagate >> task_load_parts

        task_check_text_ety = SQLExecuteQueryOperator(
            task_id = "check_text_etymology",
            conn_id = local_db_conn_id,
            sql = "sql/check-text-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check elements with a text etymology

                Check elements with an etymology that comes from `name:etymology`.
            """
        )
        task_remove_ele_too_big >> task_check_text_ety

        task_check_wd_ety = SQLExecuteQueryOperator(
            task_id = "check_wikidata_etymology",
            conn_id = local_db_conn_id,
            sql = "sql/check-wd-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check elements with a Wikidata etymology

                Check elements with an etymology that comes from `subject:wikidata`, `buried:wikidata`, `name:etymology:wikidata` or `wikidata`+`...`.
            """
        )
        task_propagate >> task_check_wd_ety

        task_move_ele = SQLExecuteQueryOperator(
            task_id = "move_elements_with_etymology",
            conn_id = local_db_conn_id,
            sql = "sql/move-elements-with-etymology.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove elements without any etymology

                Move only elements with an etymology from the `osmdata` temporary table of the local PostGIS DB to the `element` table.
            """
        )
        [task_load_parts, task_check_wd_ety, task_check_text_ety] >> task_move_ele

        task_setup_ety_fk = SQLExecuteQueryOperator(
            task_id = "setup_etymology_foreign_key",
            conn_id = local_db_conn_id,
            sql = "sql/etymology-foreign-key.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Apply the foreign key from etymology to wikidata
            """
        )
        task_move_ele >> task_setup_ety_fk

        task_check_whether_to_drop = ShortCircuitOperator(
            task_id = "check_whether_to_drop_temporary_tables",
            python_callable = lambda **context: context["params"]["drop_temporary_tables"],
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check whether to drop temporary tables

                Check whether to remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate etymologies.

                Links:
                * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
            """
        )
        task_move_ele >> task_check_whether_to_drop

        task_drop_temp_tables = SQLExecuteQueryOperator(
            task_id = "drop_temporary_tables",
            conn_id = local_db_conn_id,
            sql = "sql/drop-temp-tables.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove temporary tables

                Remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate etymologies.
            """
        )
        task_check_whether_to_drop >> task_drop_temp_tables

        task_global_map = SQLExecuteQueryOperator(
            task_id = "setup_global_map",
            conn_id = local_db_conn_id,
            sql = "sql/global-map-view.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md="""
                # Save the global map view

                Create in the local PostGIS DB the materialized view used for the clustered view at very low zoom level.
            """
        )
        task_move_ele >> task_global_map

        task_read_last_update = BashOperator(
            task_id = "read_last_data_update",
            bash_command='cat "$dateFilePath"',
            env = { "dateFilePath": pg_date_path },
            do_xcom_push = True,
            dag = self,
        )

        task_save_last_update = SQLExecuteQueryOperator(
            task_id = "save_last_data_update",
            conn_id = local_db_conn_id,
            sql = """
                CREATE OR REPLACE FUNCTION oem.last_data_update()
                    RETURNS character varying
                    LANGUAGE 'sql'
                AS $BODY$
                SELECT %(last_update)s;
                $BODY$;
            """,
            parameters = {
                "last_update": "{{ ti.xcom_pull(task_ids='read_last_data_update', key='return_value') }}"
            },
            dag = self,
            doc_md="""
                # Save into the DB the date of the last update

                Create in the local PostGIS DB the function that allows to retrieve the date of the last update of the data.
            """
        )
        [task_setup_schema,task_read_last_update] >> task_save_last_update

        task_pg_dump = BashOperator(
            task_id = "pg_dump",
            trigger_rule = TriggerRule.NONE_FAILED,
            bash_command='pg_dump --file="$backupFilePath" --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema="oem" --verbose --no-owner --no-privileges --no-tablespaces',
            env= {
                "backupFilePath": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/db.backup",
                "host": f'{{{{ conn["{local_db_conn_id}"].host }}}}',
                "port": f'{{{{ (conn["{local_db_conn_id}"].port)|string }}}}',
                "user": f'{{{{ conn["{local_db_conn_id}"].login }}}}',
                "dbname": f'{{{{ conn["{local_db_conn_id}"].schema }}}}',
                "PGPASSWORD": f'{{{{ conn["{local_db_conn_id}"].password }}}}',
            },
            dag = self,
            doc_md="""
                # Backup the data from the local DB

                Backup the data from the local DB with pg_dump into the backup file.

                Links:
                * [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/bash.html)
                * [Jinja template in f-string documentation](https://stackoverflow.com/questions/63788781/use-python-f-strings-and-jinja-at-the-same-time)
            """
        )
        [task_setup_ety_fk, task_drop_temp_tables, task_global_map, task_save_last_update, task_create_work_dir] >> task_pg_dump

        group_upload = TaskGroup("upload_to_remote_db", tooltip="Upload elaborated data to the remote DB", dag=self)

        task_check_pg_restore = ShortCircuitOperator(
            task_id = "check_upload_conn_id",
            python_callable=check_postgre_conn_id,
            op_kwargs = {
                "conn_id": upload_db_conn_id,# "{{ params.upload_db_conn_id }}",
            },
            dag = self,
            task_group = group_upload,
            doc_md=check_postgre_conn_id.__doc__
        )
        task_pg_dump >> task_check_pg_restore

        task_prepare_upload = SQLExecuteQueryOperator(
            task_id = "prepare_db_for_upload",
            conn_id = upload_db_conn_id, # "{{ params.upload_db_conn_id }}",
            sql = "sql/prepare-db-for-upload.sql",
            dag = self,
            task_group = group_upload,
            doc_md="""
                # Prepare the remote DB for uploading

                Prepare the remote DB configured in upload_db_conn_id for uploading data by resetting the oem schema 

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/python.html)
            """
        )
        task_check_pg_restore >> task_prepare_upload

        task_pg_restore = BashOperator(
            task_id = "pg_restore",
            bash_command='pg_restore --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --schema "oem" --verbose "$backupFilePath"',
            env= {
                "backupFilePath": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}/db.backup",
                "host": f"{{{{ conn['{upload_db_conn_id}'].host }}}}", # "{{ conn[params.upload_db_conn_id].host }}",
                "port": f"{{{{ (conn['{upload_db_conn_id}'].port)|string }}}}", # "{{ (conn[params.upload_db_conn_id].port)|string }}",
                "user": f"{{{{ conn['{upload_db_conn_id}'].login }}}}", # "{{ conn[params.upload_db_conn_id].login }}",
                "dbname": f"{{{{ conn['{upload_db_conn_id}'].schema }}}}", # "{{ conn[params.upload_db_conn_id].schema }}",
                "PGPASSWORD": f"{{{{ conn['{upload_db_conn_id}'].password }}}}", # "{{ conn[params.upload_db_conn_id].password }}",
            },
            dag = self,
            task_group = group_upload,
            doc_md="""
                # Upload the data on the remote DB

                Upload the data from the backup file on the remote DB configured in upload_db_conn_id with pg_restore.

                Links:
                * [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/howto/operator/bash.html)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.5.1/templates-ref.html)
            """
        )
        task_prepare_upload >> task_pg_restore

        group_cleanup = TaskGroup("cleanup", tooltip="Cleanup the DAG temporary files", dag=self)

        task_wait_cleanup = TimeDeltaSensorAsync(
            task_id = 'wait_for_cleanup_time',
            delta = timedelta(days=days_before_cleanup),
            trigger_rule = TriggerRule.NONE_SKIPPED,
            dag = self,
            task_group = group_cleanup,
            doc_md = """
                # Wait for the time to cleanup the temporary files

                Links:
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.5.1/templates-ref.html)
            """
        )
        task_pg_dump >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workDir"',
            env = { "workDir": "/workdir/{{ ti.dag_id }}/{{ ti.run_id }}", },
            dag = self,
            task_group = group_cleanup,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_wait_cleanup >> task_cleanup
