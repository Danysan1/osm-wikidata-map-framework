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
from airflow.models.param import Param
from airflow.operators.empty import EmptyOperator
from airflow.utils.trigger_rule import TriggerRule
from airflow.utils.task_group import TaskGroup
from airflow.utils.edgemodifier import Label
from airflow.sensors.time_delta import TimeDeltaSensorAsync
from airflow.providers.amazon.aws.transfers.local_to_s3 import LocalFilesystemToS3Operator
from airflow.exceptions import AirflowNotFoundException
from Osm2pgsqlOperator import Osm2pgsqlOperator
from LoadRelatedDockerOperator import LoadRelatedDockerOperator
from TippecanoeOperator import TippecanoeOperator
from Ogr2ogrDumpOperator import Ogr2ogrDumpOperator

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)

def postgres_copy_table(conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list) -> None:
    """
    Copy data from a CSV/TSV/... file to a PostgreSQL table

    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_from
    See https://github.com/psycopg/psycopg2/issues/1294
    """
    pg_hook = PostgresHook(conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath, "r", encoding="utf-8") as file:
                cursor.execute(f'SET search_path TO {schema}')
                cursor.copy_from(file, table, separator, columns = columns)
            print("Inserted row count:", cursor.rowcount)

def dump_postgres_table(conn_id:str, filepath:str, separator:str, schema:str, table:str) -> None:
    """
    Copy data from a PostgreSQL table to a CSV/TSV/... file

    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_to
    See https://github.com/psycopg/psycopg2/issues/1294
    """
    pg_hook = PostgresHook(conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath, "w", encoding="utf-8") as file:
                cursor.execute(f'SET search_path TO {schema}')
                cursor.copy_to(file, table, separator)
            print("Dumped row count:", cursor.rowcount)

def check_postgres_conn_id(conn_id:str, require_upload:bool, **context) -> bool:
    """
        # Check DB connection ID

        Check whether the connection ID to the DB is available: if it is, proceed to restore the data, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    if require_upload and (not "upload_to_db" in context["params"] or not context["params"]["upload_to_db"]):
        print("Upload to remote DB disabled in the DAG parameters, skipping upload")
        return False

    if not conn_id:
        print("Remote DB connection ID not specified, skipping upload")
        return False
    
    try:
        pg_hook = PostgresHook(conn_id)
        with pg_hook.get_conn() as pg_conn:
            with pg_conn.cursor() as cursor:
                cursor.execute("SELECT version()")
                postgis_version = cursor.fetchone()
                print(f"conn_id available, PostGIS version {postgis_version}")
    except AirflowNotFoundException:
        print(f"Remote DB connection ID ('{conn_id}') not available, skipping upload")
        return False
    
    return True

def choose_load_osm_data_task(**context) -> str:
    """
        # Check how to load data into the DB

        Check whether to load the OSM data from the filtered PBF file through `osmium export`, `osm2pgsql` or imposm.

        The `load_on_db_method` parameter is passed through the params object to allow customization when triggering the DAG.
        Osmium is the default choice due to the facts that
        * loading with `osmium export` is split in two parts (conversion with `osmium export` from PBF to PG tab-separated-values which takes most of the time and loading with Postgres `COPY` which is fast), so if something goes wrong during loading or downstream it's faster to fix the problem and load again from the PG file
        * loading with `osmium export`+`COPY` is often faster than loading `osm2pgsql`
        * it would anyway be impossible to use osm2pgsql data update features
 
        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    
    if context["params"]["load_on_db_method"] == "osmium":
        return "load_elements_from_pg_file"
    
    if context["params"]["load_on_db_method"] == "osm2pgsql":
        return "load_elements_with_osm2pgsql"
    
    if context["params"]["load_on_db_method"] == "imposm":
        return "load_elements_with_imposm"
    
    raise Exception(f"Unknown load_on_db_method: '{context['params']['load_on_db_method']}'")

def choose_load_wikidata_task(**context) -> str:
    """
        # Check whether and how to download data from Wikidata into the DB

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    from airflow.models import Variable
    direct_properties = Variable.get("osm_wikidata_properties", deserialize_json=True, default_var=None)
    indirect_property = Variable.get("wikidata_indirect_property", default_var=None)
    if direct_properties:
        next_task = "download_wikidata_direct_related"
    elif indirect_property:
        next_task = "download_wikidata_reverse_related"
    else:
        next_task = "choose_propagation_method"
    return f"elaborate_data.{next_task}"

def choose_propagation_method(propagate_data:str) -> str:
    """
        # Check whether and how to propagate

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.7.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.7.0/concepts/params.html)
        * [Variables documentation](https://airflow.apache.org/docs/apache-airflow/2.7.0/core-concepts/variables.html)
    """

    if propagate_data == "global" or propagate_data == "true":
        return "elaborate_data.propagate_etymologies_globally"
    elif propagate_data == "local":
        return "elaborate_data.propagate_etymologies_locally"
    else:
        return "elaborate_data.join_post_propagation"

class OwmfDbInitDAG(DAG):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.
    Triggered on the availability of the PG tab-separated-values file ready for importing into the DB.
    """

    def __init__(self,
            local_db_conn_id:str="local_owmf_postgis_db",
            upload_db_conn_id:str=None,
            prefix:str="owmf",
            days_before_cleanup:int=1,
            **kwargs
        ):
        """
        Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.

        Parameters:
        ----------
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
        upload_db_conn_id: str
            Postgres connection ID for the production Database the DAG will upload to
        prefix: str
            prefix to search in the PBF filename 
        load_on_db_method: string
            choose which tool to use to upload the filtered OSM data
        days_before_cleanup: int
            number of days to wait before cleaning up the DAG run temporary folder

        See https://airflow.apache.org/docs/apache-airflow/2.6.0/index.html
        """

        # https://airflow.apache.org/docs/apache-airflow/2.6.0/timezone.html
        # https://pendulum.eustace.io/docs/#instantiation
        start_date = datetime(year=2022, month=9, day=15, tz='local')

        doc_md="""
            # OSM-Wikidata Map Framework DB initialization

            * downloads and and filters OSM data
            * downloads relevant OSM data
            * combines OSM and Wikidata data
            * uploads the output to the production DB.

            Documentation in the task descriptions and in the [project's CONTRIBUTING.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/CONTRIBUTING.md).
        """

        if not prefix or prefix=="":
            raise Exception("Prefix must be specified")
        
        filtered_pbf_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf'
        filtered_pbf_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pbf.date.txt'
        pg_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg'
        pg_date_path = f'/workdir/{prefix}/{prefix}.filtered.osm.pg.date.txt'
        pg_dataset = Dataset(f'file://{pg_path}')
        workdir = join("/workdir",prefix,"{{ ti.dag_id }}","{{ ti.run_id }}")

        default_params={
            "prefix": prefix,
            "load_on_db_method": Param(default="osmium", type="string", enum=["osmium","osm2pgsql","imposm"]),
            "drop_temporary_tables": True,
            "upload_to_db": False,
            "generate_pmtiles": True,
        }

        super().__init__(
            start_date=start_date,
            catchup=False,
            schedule = [pg_dataset],
            tags=['owmf', f'owmf-{prefix}', 'owmf-db-init', 'consumes'],
            params=default_params,
            doc_md = doc_md,
            **kwargs
        )

        db_prepare_group = TaskGroup("prepare_db", tooltip="Prepare the DB", dag=self)

        task_check_pg_local = ShortCircuitOperator(
            task_id = "check_local_conn_id",
            python_callable=check_postgres_conn_id,
            op_kwargs = {
                "conn_id": local_db_conn_id,
                "require_upload": False,
            },
            dag = self,
            task_group = db_prepare_group,
            doc_md=check_postgres_conn_id.__doc__
        )

        task_create_work_dir = BashOperator(
            task_id = "create_work_dir",
            bash_command = 'mkdir -p "$workDir"',
            env = { "workDir": workdir, },
            dag = self,
        )
        
        task_setup_db_ext = SQLExecuteQueryOperator(
            task_id = "setup_db_extensions",
            conn_id = local_db_conn_id,
            sql = "sql/01-setup-db-extensions.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the necessary extensions on the local DB

                Setup PostGIS and HSTORE on the local Postgres DB if they are not already set up.
            """
        )
        task_check_pg_local >> task_setup_db_ext

        task_setup_schema = SQLExecuteQueryOperator(
            task_id = "setup_schema",
            conn_id = local_db_conn_id,
            sql = "sql/03-setup-schema.sql",
            dag = self,
            task_group = db_prepare_group,
            doc_md = """
                # Setup the OWMF DB schema

                Reset the schema 'owmf' on the local PostGIS DB, then set it up from scratch.
            """
        )
        task_setup_db_ext >> task_setup_schema

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
            python_callable = postgres_copy_table,
            op_kwargs = {
                "conn_id": local_db_conn_id,
                "filepath": pg_path,
                "separator": '\t',
                "schema": 'owmf',
                "table": 'osmdata',
                "columns": ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"],
            },
            dag = self,
            task_group=group_db_load,
            doc_md="""
                # Load OSM data from the PG file

                Load the filtered OpenStreetMap data from the PG tab-separated-values file to the `osmdata` table of the local PostGIS DB.

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html)
            """
        )
        [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_pg

        task_load_ele_osm2pgsql = Osm2pgsqlOperator(
            task_id = "load_elements_with_osm2pgsql",
            container_name = "osm-wikidata_map_framework-load_elements_with_osm2pgsql",
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
            sql = "sql/04-convert-osm2pgsql-data.sql",
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
            sql = "sql/05-remove-elements-too-big.sql",
            parameters = {
                "osm_key": "{{ var.json.osm_wikidata_keys[0] or '' }}"
            },
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Remove remaining non interesting elements

                Remove from the local PostGIS DB elements that aren't interesting and that it wasn't possible to remove during the filtering phase:
                * elements too big that wouldn't be visible anyway on the map 
                * elements that have a wrong etymology (*:wikidata and wikidata values are equal)
            """
        )
        join_post_load_ele >> task_remove_ele_too_big

        task_create_key_index = SQLExecuteQueryOperator(
            task_id = "create_key_index",
            conn_id = local_db_conn_id,
            sql = "sql/06-create-key-index.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Create the indexes on `osmdata`

                Creates the indexes on the `osmdata` table, necessary for the next elaboration steps
            """
        )
        task_remove_ele_too_big >> task_create_key_index

        task_convert_ele_wd_cods = SQLExecuteQueryOperator(
            task_id = "convert_element_wikidata_cods",
            conn_id = local_db_conn_id,
            sql = "sql/07-convert-element-wikidata-cods.jinja.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert OSM - Wikidata associations

                Fill the element_wikidata_cods table with OSM element <-> Wikidata Q-ID ("code") associations obtained from OSM elements, specifying for each association the source (`wikidata` / `*:wikidata`).
                
                Links:
                * [`wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata)
                * [`*:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links)
            """
        )
        task_create_key_index >> task_convert_ele_wd_cods

        task_convert_wd_ent = SQLExecuteQueryOperator(
            task_id = "convert_wikidata_entities",
            conn_id = local_db_conn_id,
            sql = "sql/08-convert-wikidata-entities.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Load Wikidata entities from OSM etymologies

                Load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are etymologies from OSM (values from `*:wikidata` configured tags).
            """
        )
        task_convert_ele_wd_cods >> task_convert_wd_ent

        task_convert_ety = SQLExecuteQueryOperator(
            task_id = "convert_etymologies",
            conn_id = local_db_conn_id,
            sql = "sql/09-convert-etymologies.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Convert the etymologies

                Fill the `etymology` table of the local PostGIS DB elaborated the etymologies from the `element_wikidata_cods` table.
            """
        )
        task_convert_wd_ent >> task_convert_ety

        task_check_load_wd_related = BranchPythonOperator(
            task_id = "check_whether_to_load_named_after",
            python_callable = choose_load_wikidata_task,
            dag = self,
            task_group = elaborate_group,
            doc_md = choose_load_wikidata_task.__doc__
        )
        task_convert_ety >> task_check_load_wd_related

        task_load_wd_direct = LoadRelatedDockerOperator(
            task_id = "download_wikidata_direct_related",
            container_name = "osm-wikidata_map_framework-load_direct_related",
            postgres_conn_id = local_db_conn_id,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata direct related entities

                * load into the `osmdata` table of the local PostGIS DB all the Wikidata entities with a location and the configured direct properties which do not already exist
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
                * load into the `etymology` table of the local PostGIS DB the direct related relationships
                
                Uses the Wikidata SPARQL query service through `LoadRelatedDockerOperator`:
            """) + dedent(LoadRelatedDockerOperator.__doc__)
        )
        task_check_load_wd_related >> task_load_wd_direct

        task_load_wd_reverse = EmptyOperator(
            task_id = "download_wikidata_reverse_related",
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent("""
                # Load Wikidata reverse related entities
                            
                # YET TO BE IMPLEMENTED

                For each existing Wikidata entity representing an OSM element:
                * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
                * load into the `etymology` table of the local PostGIS DB the reverse related relationships
            """)
        )
        task_check_load_wd_related >> task_load_wd_reverse

        task_check_text_ety = SQLExecuteQueryOperator(
            task_id = "check_text_etymology",
            conn_id = local_db_conn_id,
            sql = "sql/10-check-text-etymology.jinja.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Check elements with a text etymology

                Check elements with an etymology that comes from the key configured in 'osm_text_key' or 'osm_description_key'.
            """
        )
        task_create_key_index >> task_check_text_ety

        task_check_propagation = BranchPythonOperator(
            task_id = "choose_propagation_method",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            python_callable = choose_propagation_method,
            op_kwargs = {
                "propagate_data": '{{ var.value.propagate_data }}',
            },
            dag = self,
            task_group=elaborate_group,
            doc_md = choose_propagation_method.__doc__
        )
        [task_check_load_wd_related, task_load_wd_direct, task_load_wd_reverse, task_check_text_ety] >> task_check_propagation

        task_propagate_globally = SQLExecuteQueryOperator(
            task_id = "propagate_etymologies_globally",
            conn_id = local_db_conn_id,
            sql = "sql/11-propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
                # Propagate the etymologies

                Check the reliable etymologies (where multiple case-insensitive homonymous elements have etymologies to the exactly the same Wikidata entity).
                Then propagate reliable etymologies to case-insensitive homonymous elements that don't have any etymology.
            """
        )
        task_check_propagation >> task_propagate_globally

        task_propagate_locally = SQLExecuteQueryOperator(
            task_id = "propagate_etymologies_locally",
            conn_id = local_db_conn_id,
            sql = "sql/11-propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
        )
        task_check_propagation >> task_propagate_locally

        join_post_propagation = EmptyOperator(
            task_id = "join_post_propagation",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=elaborate_group,
            doc_md="""
                # Join branches back together

                Dummy task for joining the path after the branching
            """
        )
        [task_check_propagation, task_propagate_locally, task_propagate_globally] >> join_post_propagation

        post_elaborate_group = TaskGroup("post_elaboration", tooltip="Actions after data elaboration", dag=self)

        task_move_ele = SQLExecuteQueryOperator(
            task_id = "move_elements_with_etymology",
            conn_id = local_db_conn_id,
            sql = "sql/12-move-elements-with-etymology.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
                # Remove elements without any etymology

                Move only elements with an etymology from the `osmdata` temporary table of the local PostGIS DB to the `element` table.
            """
        )
        join_post_propagation >> task_move_ele

        task_setup_ety_fk = SQLExecuteQueryOperator(
            task_id = "setup_etymology_foreign_key",
            conn_id = local_db_conn_id,
            sql = "sql/13-etymology-foreign-key.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
                # Apply the foreign key from etymology to wikidata
            """
        )
        task_move_ele >> task_setup_ety_fk

        task_create_source_index = SQLExecuteQueryOperator(
            task_id = "create_source_index",
            conn_id = local_db_conn_id,
            sql = "sql/14-create-source-index.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
                # Create the indexes on `etymology`

                Creates the indexes on the `etymology` table, necessary for the runtime queries
            """
        )
        task_setup_ety_fk >> task_create_source_index

        task_check_whether_to_drop = ShortCircuitOperator(
            task_id = "check_whether_to_drop_temporary_tables",
            python_callable = lambda **context: context["params"]["drop_temporary_tables"],
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
                # Check whether to drop temporary tables

                Check whether to remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate etymologies.

                Links:
                * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.operators.python.BranchPythonOperator)
            """
        )
        task_setup_ety_fk >> task_check_whether_to_drop

        task_drop_temp_tables = SQLExecuteQueryOperator(
            task_id = "drop_temporary_tables",
            conn_id = local_db_conn_id,
            sql = "sql/13-drop-temp-tables.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
                # Remove temporary tables

                Remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate etymologies.
            """
        )
        task_check_whether_to_drop >> task_drop_temp_tables

        task_backend_views = SQLExecuteQueryOperator(
            task_id = "setup_backend_views",
            conn_id = local_db_conn_id,
            sql = "sql/13-backend-views.jinja.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md="""
                # Save the global map view

                Create in the local PostGIS DB the materialized view used for the clustered view at very low zoom level.
            """
        )
        task_setup_ety_fk >> task_backend_views

        task_etymology_map = SQLExecuteQueryOperator(
            task_id = "setup_etymology_map",
            conn_id = local_db_conn_id,
            sql = "sql/13-setup-rpc.jinja.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md="""
                # Setup the vector tiles RPC functions

                Create in the local PostGIS DB the functions used by Maplibre Martin for generating the vector tiles.

                Links:
                * [Maplibre Martin documentation](https://maplibre.org/martin/)
                * [Martin PostgreSQL function sources](https://maplibre.org/martin/33-sources-pg-functions.html)
            """
        )
        task_backend_views >> task_etymology_map

        task_dataset_view = SQLExecuteQueryOperator(
            task_id = "setup_dataset_view",
            conn_id = local_db_conn_id,
            sql = "sql/13-dataset-view.sql",
            dag = self,
            task_group=post_elaborate_group,
            doc_md="""
                # Save the dataset view

                Create in the local PostGIS DB the materialized view used for the dataset download.
            """
        )
        task_setup_ety_fk >> task_dataset_view

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
                CREATE OR REPLACE FUNCTION owmf.last_data_update()
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

        task_join_post_elaboration = EmptyOperator(
            task_id = "join_post_elaboration",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=post_elaborate_group
        )
        [task_create_source_index, task_drop_temp_tables, task_etymology_map, task_backend_views, task_dataset_view, task_save_last_update, task_create_work_dir] >> task_join_post_elaboration

        group_vector_tiles = TaskGroup("vector_tiles", tooltip="Generate the vector tiles and/or PMTiles", dag=self)

        task_check_dump = ShortCircuitOperator(
            task_id = "check_dump",
            python_callable=lambda **context: ("generate_pmtiles" in context["params"] and context["params"]["generate_pmtiles"]) or ("generate_mbtiles" in context["params"] and context["params"]["generate_mbtiles"]),
            dag = self,
            task_group = group_vector_tiles,
            doc_md="Check whether data should be dumped to FlatGeobuf for vector tiles and/or PMTiles generation"
        )
        task_join_post_elaboration >> task_check_dump

        task_dump_etymology_map = Ogr2ogrDumpOperator(
            task_id = "dump_etymology_map",
            dag = self,
            task_group=group_vector_tiles,
            postgres_conn_id = local_db_conn_id,
            dest_format = "FlatGeobuf",
            dest_path = join(workdir,'etymology_map.fgb'),
            query = "SELECT * FROM owmf.etymology_map_dump",
            doc_md=    """
            # FlatGeobuf dump

            Dump all the elements from the local DB with their respective etymologies into a FlatGeobuf file
            """
        )
        task_check_dump >> task_dump_etymology_map

        task_dump_elements = Ogr2ogrDumpOperator(
            task_id = "dump_elements",
            dag = self,
            task_group=group_vector_tiles,
            postgres_conn_id = local_db_conn_id,
            dest_format = "FlatGeobuf",
            dest_path = join(workdir,'elements.fgb'),
            query = "SELECT * FROM owmf.vm_elements",
            doc_md = "Dump all the centroids of the elements from the local DB into a FlatGeobuf file"
        )
        task_check_dump >> task_dump_elements

        task_check_pmtiles = ShortCircuitOperator(
            task_id = "check_pmtiles",
            python_callable=lambda **context: "generate_pmtiles" in context["params"] and context["params"]["generate_pmtiles"],
            dag = self,
            task_group = group_vector_tiles,
            doc_md="Check whether pmtiles should be generated"
        )

        task_generate_etymology_map_pmtiles = TippecanoeOperator(
            task_id = "generate_etymology_map_pmtiles",
            dag = self,
            task_group = group_vector_tiles,
            input_file = join(workdir,'etymology_map.fgb'),
            output_file = join(workdir,'etymology_map.pmtiles'),
            layer_name = "etymology_map",
            min_zoom = 13,
            max_zoom = 13,
            extra_params = "-f",
            doc_md = TippecanoeOperator.__doc__
        )
        [task_check_pmtiles, task_dump_etymology_map] >> task_generate_etymology_map_pmtiles

        elements_extra_params = "-f -r1 --cluster-distance=150 --accumulate-attribute=el_num:sum" # Do not automatically drop points; Cluster together features that are closer than about 150 pixels from each other; Sum the el_num attribute in features that are clustered together
        task_generate_elements_pmtiles = TippecanoeOperator(
            task_id = "generate_elements_pmtiles",
            dag = self,
            task_group = group_vector_tiles,
            input_file = join(workdir,'elements.fgb'),
            output_file = join(workdir,'elements.pmtiles'),
            layer_name = "elements",
            min_zoom = 1,
            max_zoom = 12,
            extra_params = elements_extra_params,
            doc_md = TippecanoeOperator.__doc__
        )
        [task_check_pmtiles, task_dump_elements] >> task_generate_elements_pmtiles

        dataset_path = join(workdir,'dataset.csv')
        task_dump_dataset = PythonOperator(
            task_id = "dump_dataset",
            python_callable=dump_postgres_table,
            op_kwargs = {
                "conn_id": local_db_conn_id,
                "filepath": dataset_path,
                "separator": ',',
                "schema": 'owmf',
                "table": 'vm_dataset',
            },
            dag = self,
            task_group = group_vector_tiles,
            doc_md = "Dump the content of the dataset view into a CSV file to be uploaded to S3"
        )
        task_check_pmtiles >> task_dump_dataset

        task_etymology_map_pmtiles_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_etymology_map_pmtiles_to_s3",
            dag = self,
            filename = join(workdir,'etymology_map.pmtiles'),
            dest_key = join("{{ var.value.pmtiles_base_s3_key }}",prefix,"etymology_map.pmtiles"),
            replace = True,
            aws_conn_id = "aws_s3",
            task_group = group_vector_tiles,
            doc_md = """
                # Upload etymology_map.pmtiles to S3

                Upload the PMTiles etymology_map file to AWS S3.

                Links:
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
                * [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
            """
        )
        task_generate_etymology_map_pmtiles >> task_etymology_map_pmtiles_s3

        task_elements_pmtiles_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_elements_pmtiles_to_s3",
            dag = self,
            filename = join(workdir,'elements.pmtiles'),
            dest_key = join("{{ var.value.pmtiles_base_s3_key }}",prefix,"elements.pmtiles"),
            replace = True,
            aws_conn_id = "aws_s3",
            task_group = group_vector_tiles,
            doc_md = """
                # Upload elements.pmtiles to S3

                Upload the PMTiles elements file to AWS S3.

                Links:
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
                * [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
            """
        )
        task_generate_elements_pmtiles >> task_elements_pmtiles_s3

        task_dataset_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_dataset_pmtiles_to_s3",
            dag = self,
            filename = dataset_path,
            dest_key = join('{{ var.value.pmtiles_base_s3_key }}',prefix,'dataset.csv'),
            replace = True,
            aws_conn_id = "aws_s3",
            task_group = group_vector_tiles,
            doc_md = """
                # Upload dataset to S3

                Upload the dataset CSV file to AWS S3.

                Links:
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
                * [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
            """
        )
        task_dump_dataset >> task_dataset_s3

        task_date_pmtiles_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_date_pmtiles_to_s3",
            dag = self,
            filename = pg_date_path,
            dest_key = join('{{ var.value.pmtiles_base_s3_key }}',prefix,'date.txt'),
            replace = True,
            aws_conn_id = "aws_s3",
            task_group = group_vector_tiles,
            doc_md = """
                # Upload PMTiles date to S3

                Upload the date file for PMTiles to AWS S3.

                Links:
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
                * [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
                * [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
            """
        )
        [task_etymology_map_pmtiles_s3, task_elements_pmtiles_s3, task_dataset_s3] >> task_date_pmtiles_s3
        
        group_upload = TaskGroup("upload_to_remote_db", tooltip="Upload elaborated data to the remote DB", dag=self)

        task_check_pg_restore = ShortCircuitOperator(
            task_id = "check_upload_conn_id",
            python_callable=check_postgres_conn_id,
            op_kwargs = {
                "conn_id": upload_db_conn_id,# "{{ params.upload_db_conn_id }}",
                "require_upload": True,
            },
            dag = self,
            task_group = group_upload,
            doc_md=check_postgres_conn_id.__doc__
        )
        task_join_post_elaboration >> task_check_pg_restore
        
        task_pg_dump = BashOperator(
            task_id = "pg_dump",
            trigger_rule = TriggerRule.NONE_FAILED,
            bash_command='pg_dump --file="$backupFilePath" --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema="owmf" --verbose --no-owner --no-privileges --no-tablespaces',
            env= {
                "backupFilePath": join(workdir,"db.backup"),
                "host": f'{{{{ conn["{local_db_conn_id}"].host }}}}',
                "port": f'{{{{ (conn["{local_db_conn_id}"].port)|string }}}}',
                "user": f'{{{{ conn["{local_db_conn_id}"].login }}}}',
                "dbname": f'{{{{ conn["{local_db_conn_id}"].schema }}}}',
                "PGPASSWORD": f'{{{{ conn["{local_db_conn_id}"].password }}}}',
            },
            dag = self,
            task_group=group_upload,
            doc_md="""
                # Backup the data from the local DB

                Backup the data from the local DB with pg_dump into the backup file.

                Links:
                * [pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/bash.html)
                * [Jinja template in f-string documentation](https://stackoverflow.com/questions/63788781/use-python-f-strings-and-jinja-at-the-same-time)
            """
        )
        task_check_pg_restore >> task_pg_dump

        task_setup_db_ext = SQLExecuteQueryOperator(
            task_id = "setup_upload_db_extensions",
            conn_id = upload_db_conn_id, # "{{ params.upload_db_conn_id }}",
            sql = "sql/01-setup-db-extensions.sql",
            dag = self,
            task_group = group_upload,
            doc_md = """
                # Setup the necessary extensions on the remote DB

                Setup PostGIS and HSTORE on the remote DB configured in upload_db_conn_id if they are not already set up.
            """
        )
        task_pg_dump >> task_setup_db_ext

        task_prepare_upload = SQLExecuteQueryOperator(
            task_id = "prepare_db_for_upload",
            conn_id = upload_db_conn_id, # "{{ params.upload_db_conn_id }}",
            sql = "sql/15-prepare-db-for-upload.sql",
            dag = self,
            task_group = group_upload,
            doc_md="""
                # Prepare the remote DB for uploading

                Prepare the remote DB configured in upload_db_conn_id for uploading data by resetting the owmf schema 

                Links:
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.operators.python.PythonOperator)
                * [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html)
            """
        )
        task_setup_db_ext >> task_prepare_upload

        task_pg_restore = BashOperator(
            task_id = "pg_restore",
            bash_command='pg_restore --host "$host" --port "$port" --dbname "$dbname" --username "$user" --no-password --role "$user" --schema "owmf" --verbose --no-owner --no-privileges --no-tablespaces "$backupFilePath"',
            env= {
                "backupFilePath": join(workdir,"db.backup"),
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
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/bash/index.html?highlight=bashoperator#airflow.operators.bash.BashOperator)
                * [BashOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/bash.html)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.6.0/templates-ref.html)
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
                * [TimeDeltaSensorAsync](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/time_delta/index.html)
                * [DateTimeSensor documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/sensors/date_time/index.html)
                * [DateTimeSensor test](https://www.mikulskibartosz.name/delay-airflow-dag-until-given-hour-using-datetimesensor/)
                * [Templates reference](https://airflow.apache.org/docs/apache-airflow/2.6.0/templates-ref.html)
            """
        )
        task_join_post_elaboration >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workDir"',
            env = { "workDir": workdir, },
            dag = self,
            task_group = group_cleanup,
            doc_md = """
                # Cleanup the work directory

                Remove the DAG run folder
            """
        )
        task_wait_cleanup >> task_cleanup
