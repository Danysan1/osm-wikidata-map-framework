from os.path import dirname, abspath, join
from textwrap import dedent
from datetime import timedelta
from pendulum import datetime, now
from airflow import DAG, Dataset
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator, BranchPythonOperator, ShortCircuitOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
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
from TileJoinOperator import TileJoinOperator
from Ogr2ogrDumpOperator import Ogr2ogrDumpOperator

LOAD_ON_DB_METHOD = "load_on_db_method"
DEFAULT_LOAD_ON_DB_METHOD = "osmium"

DROP_TEMPORARY_TABLES = "drop_temporary_tables"
DEFAULT_DROP_TEMPORARY_TABLES = True

UPLOAD_TO_DB = "upload_to_db"
DEFAULT_UPLOAD_TO_DB = False

GENERATE_PMTILES = "generate_pmtiles"
DEFAULT_GENERATE_PMTILES = True
PMTILES_LAYER_NAME = "detail" # If you need to change this, remember to change also the corresponding front-end constant (in OwmfMap.tsx)

UPLOAD_TO_S3 = "upload_to_s3"
DEFAULT_UPLOAD_TO_S3 = True

DEFAULT_DAYS_BEFORE_CLEANUP = 7

def get_absolute_path(filename:str, folder:str|None = None) -> str:
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
    from airflow.hooks.postgres_hook import PostgresHook
    
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
    import csv
    from airflow.hooks.postgres_hook import PostgresHook

    pg_hook = PostgresHook(conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath, "w", encoding="utf-8") as file:
                #cursor.execute(f'SET search_path TO {schema}')
                #cursor.copy_to(file, table, separator)
                cursor.execute(f"SELECT * FROM {schema}.{table}")
                writer = csv.writer(file, delimiter=separator)
                writer.writerow([
                    'Linked Wikidata entity',
                    'Element name',
                    'Total count',
                    'Count from OSM',
                    'Count from OSM+Wikidata',
                    'Count from Wikidata',
                    'Count from propagation'])
                for row in cursor:
                    writer.writerow(row)
            print("Dumped row count:", cursor.rowcount)

def check_postgres_conn_id(conn_id:str, require_upload = True, **context) -> bool:
    """
        # Check DB connection ID

        Check whether the connection ID to the DB is available: if it is, proceed to restore the data, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    from airflow.hooks.postgres_hook import PostgresHook
    
    enable_upload_from_params = context["params"].get(UPLOAD_TO_DB, DEFAULT_UPLOAD_TO_DB)
    if require_upload and not enable_upload_from_params:
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
    except AirflowNotFoundException as e:
        print(f"Remote DB connection ID ('{conn_id}') is NOT available, skipping upload. Detailed error:")
        print(e)
        return False
    except Exception as e:
        print(f"Failed connecting to remote DB connection ID ('{conn_id}'), skipping upload. Detailed error:")
        print(e)
        return False
    
    print(f"Remote DB connection ID ('{conn_id}') is available, uploading")
    return True

def check_s3_conn_id(conn_id:str, base_s3_uri_var_id:str, require_upload = True, **context) -> bool:
    """
        # Check S3 connection ID

        Check whether the connection ID to an S3 bucket is available: if it is, proceed, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    from airflow.hooks.S3_hook import S3Hook
    from airflow.models.variable import Variable

    enable_upload_from_params = context["params"].get(UPLOAD_TO_S3, DEFAULT_UPLOAD_TO_S3)

    if require_upload and not enable_upload_from_params:
        print("Upload to S3 bucket disabled in the DAG parameters, skipping upload")
        return False

    if not conn_id:
        print(f"AWS connection ('{conn_id}') not available, skipping upload")
        return False

    if not Variable.get(base_s3_uri_var_id, None):
        print(f"S3 base URI variable ('{base_s3_uri_var_id}') not available, skipping upload")
        return False
    
    base_s3_uri = Variable.get(base_s3_uri_var_id)
    try:
        s3_hook = S3Hook(conn_id)
        # See https://airflow.apache.org/docs/apache-airflow/1.10.10/_api/airflow/hooks/S3_hook/index.html
        if s3_hook.check_for_key(f"{base_s3_uri}/"):
            print(f"Base S3 URI '{base_s3_uri}/' exists and is reachable with connection ID '{conn_id}', uploading")
            return True
        else:
            print(f"Base S3 URI '{base_s3_uri}/' does not exist or is not reachable with connection ID '{conn_id}', skipping upload")
            return False
    except AirflowNotFoundException as e:
        print(f"Base S3 URI '{base_s3_uri}/' does not exist or is not reachable with connection ID '{conn_id}', skipping upload. Detailed error:")
        print(e)
        return False
    except Exception as e:
        print(f"Failed connecting to S3 (connection ID '{conn_id}', base S3 URI '{base_s3_uri}/'), skipping upload. Detailed error:")
        print(e)
        return False

def choose_load_osm_data_task(base_file_path:str, **context) -> str:
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
    
    load_on_db_method = context["params"].get(LOAD_ON_DB_METHOD, DEFAULT_LOAD_ON_DB_METHOD)
    if load_on_db_method == "osmium":
        date_path = f"{base_file_path}.pg.date.txt"
        next_task = "load_elements_from_pg_file"
    elif load_on_db_method == "osm2pgsql":
        date_path = f"{base_file_path}.pbf.date.txt"
        next_task = "load_elements_with_osm2pgsql"
    elif load_on_db_method == "imposm":
        date_path = f"{base_file_path}.pbf.date.txt"
        next_task = "load_elements_with_imposm"
    else:
        raise Exception(f"Unknown load_on_db_method: '{load_on_db_method}'")
    
    with open(date_path, "r") as f:
        date = f.read()
        context["ti"].xcom_push(key="date_file_path", value=date_path)
        context["ti"].xcom_push(key="last_data_update", value=date)
    
    return next_task

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
            prefix:str,
            days_before_cleanup:int=DEFAULT_DAYS_BEFORE_CLEANUP,
            wikidata_country:str|None=None,
            **kwargs
        ):
        """
        Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.

        Keyword arguments:
        ----------
        upload_db_conn_id: str
            Airflow connection ID for the Postgres DB the DAG will upload the data to
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

* ingests filtered OSM PBF data
* downloads relevant Wikidata data
* combines OSM and Wikidata data
* uploads the output to the production DB.

Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
"""

        if not prefix or prefix=="":
            raise Exception("Prefix must be specified")
        
        base_file_path = f'/workdir/{prefix}/{prefix}.filtered.osm' # .pbf / pbf.date.txt / .pg / .pg.date.txt

        pg_dataset = Dataset(f'file://{base_file_path}.pg')
        """URI of the input Airflow dataset for the DAG"""

        upload_db_conn_id = f"{prefix}-postgres"
        """Airflow connection ID for the Postgres DB the DAG will upload the data to"""

        upload_s3_conn_id = "aws_s3"
        """Airflow connection ID with the AWS credentials used for uploading the vector tiles and CSV to S3"""

        upload_s3_bucket_var_id = f"{prefix}_base_s3_uri"
        """
        Airflow variable ID with the base S3 URI on which the vector tiles and CSV will be uploaded.
        For example, for a pipeline with prefix 'planet' the base S3 URI must be configured in the Airflow variable 'planet_base_s3_uri'.
        """

        base_s3_uri = f"{{{{ var.value.{upload_s3_bucket_var_id} }}}}"
        """Base S3 URI on which the vector tiles and CSV will be uploaded"""
        
        workdir = join("/workdir",prefix,"{{ ti.dag_id }}","{{ ti.run_id }}")
        """Path to the temporary folder where the DAG will store the intermediate files"""

        local_db_conn_id=f"{prefix}_local_postgis_db"

        default_params={
            LOAD_ON_DB_METHOD: Param(type="string", enum=["osmium","osm2pgsql","imposm"], default=DEFAULT_LOAD_ON_DB_METHOD),
            DROP_TEMPORARY_TABLES: DEFAULT_DROP_TEMPORARY_TABLES,
            UPLOAD_TO_DB: DEFAULT_UPLOAD_TO_DB,
            GENERATE_PMTILES: DEFAULT_GENERATE_PMTILES,
            UPLOAD_TO_S3: DEFAULT_UPLOAD_TO_S3,
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
            doc_md = dedent(check_postgres_conn_id.__doc__)
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
            op_kwargs = {
                "base_file_path": base_file_path,
            },
            dag = self,
            task_group=group_db_load,
            doc_md = dedent(choose_load_osm_data_task.__doc__)
        )

        task_load_ele_pg = PythonOperator(
            task_id = "load_elements_from_pg_file",
            python_callable = postgres_copy_table,
            op_kwargs = {
                "conn_id": local_db_conn_id,
                "filepath": f"{base_file_path}.pg",
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

        task_load_ele_imposm = EmptyOperator(
            task_id = "load_elements_with_imposm",
            dag = self,
            task_group=group_db_load,
            doc_md="""
# Load OSM data from the PBF file using imposm

*NOT YET IMPLEMENTED!!*

Using `imposm`, load the filtered OpenStreetMap data directly from the PBF file.
"""
        )
        [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_imposm

        task_load_ele_osm2pgsql = Osm2pgsqlOperator(
            task_id = "load_elements_with_osm2pgsql",
            container_name = "airflow-load_elements_with_osm2pgsql",
            postgres_conn_id = local_db_conn_id,
            source_path = f"{base_file_path}.pbf",
            dag = self,
            task_group=group_db_load,
            doc_md="""
# Load OSM data from the PBF file using osm2pgsql

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
            doc_md="Dummy task for joining the path after the branching done to choose between DB load methods."
        )
        [task_load_ele_pg, task_convert_osm2pgsql, task_load_ele_imposm] >> join_post_load_ele

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
# Load Wikidata entities from OSM tags

Load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are referenced from configured OSM secondary Wikidata tags (`*:wikidata`).
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
# Convert the linked entities

Fill the `etymology` table of the local PostGIS DB with the linked entities derived from the `element_wikidata_cods` table.
"""
        )
        task_convert_wd_ent >> task_convert_ety

        task_check_load_wd_related = BranchPythonOperator(
            task_id = "check_whether_to_load_named_after",
            python_callable = choose_load_wikidata_task,
            dag = self,
            task_group = elaborate_group,
            doc_md = dedent(choose_load_wikidata_task.__doc__)
        )
        task_convert_ety >> task_check_load_wd_related

        task_load_wd_direct = LoadRelatedDockerOperator(
            task_id = "download_wikidata_direct_related",
            container_name = "airflow-load_direct_related",
            postgres_conn_id = local_db_conn_id,
            wikidata_country = wikidata_country,
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent(LoadRelatedDockerOperator.__doc__)
        )
        task_check_load_wd_related >> task_load_wd_direct

        task_load_wd_reverse = EmptyOperator(
            task_id = "download_wikidata_reverse_related",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
# Load Wikidata reverse related entities
            
# YET TO BE IMPLEMENTED

For each existing Wikidata entity representing an OSM element:
* load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
* load into the `etymology` table of the local PostGIS DB the reverse related relationships
"""
        )
        task_check_load_wd_related >> task_load_wd_reverse

        task_check_propagation = BranchPythonOperator(
            task_id = "choose_propagation_method",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            python_callable = choose_propagation_method,
            op_kwargs = {
                "propagate_data": '{{ var.value.propagate_data }}',
            },
            dag = self,
            task_group=elaborate_group,
            doc_md = dedent(choose_propagation_method.__doc__)
        )
        [task_check_load_wd_related, task_load_wd_direct, task_load_wd_reverse] >> task_check_propagation

        task_propagate_globally = SQLExecuteQueryOperator(
            task_id = "propagate_etymologies_globally",
            conn_id = local_db_conn_id,
            sql = "sql/11-propagate-etymologies-global.sql",
            dag = self,
            task_group=elaborate_group,
            doc_md = """
# Propagate the linked entities by name

Check the reliable linked entities (where multiple case-insensitive homonymous elements have linked entities to the exactly the same Wikidata entity).
Then propagate reliable linked entities to case-insensitive homonymous elements that don't have any etymology.
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
            python_callable = lambda **context: context["params"].get(DROP_TEMPORARY_TABLES, DEFAULT_DROP_TEMPORARY_TABLES),
            dag = self,
            task_group=post_elaborate_group,
            doc_md = """
# Check whether to drop temporary tables

Check whether to remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate linked entities.

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

    Remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate linked entities.
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

        task_save_last_update = SQLExecuteQueryOperator(
            task_id = "save_last_data_update",
            conn_id = local_db_conn_id,
            task_group = group_db_load,
            sql = """
                CREATE OR REPLACE FUNCTION owmf.last_data_update()
                    RETURNS character varying
                    LANGUAGE 'sql'
                AS $BODY$
                SELECT %(last_update)s;
                $BODY$;
            """,
            parameters = {
                "last_update": "{{ ti.xcom_pull(task_ids='choose_load_osm_data_method', key='last_data_update') }}"
            },
            dag = self,
            doc_md="""
# Save into the DB the date of the last update

Create in the local PostGIS DB the function that allows to retrieve the date of the last update of the data.
"""
        )
        [task_setup_schema,join_post_load_ele] >> task_save_last_update

        task_join_post_elaboration = EmptyOperator(
            task_id = "join_post_elaboration",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=post_elaborate_group
        )
        [task_create_source_index, task_drop_temp_tables, task_backend_views, task_dataset_view, task_save_last_update, task_create_work_dir] >> task_join_post_elaboration

        group_vector_tiles = TaskGroup("vector_tiles", tooltip="Generate the vector tiles and/or PMTiles", dag=self)

        task_check_dump = ShortCircuitOperator(
            task_id = "check_dump",
            python_callable = lambda **context: context["params"].get(GENERATE_PMTILES, DEFAULT_GENERATE_PMTILES),
            dag = self,
            task_group = group_vector_tiles,
            doc_md="Check whether data should be dumped to FlatGeobuf for vector tiles and/or PMTiles generation"
        )
        task_join_post_elaboration >> task_check_dump

        pmtiles_base_name = "{{ 'owmf' if (var.value.source_presets is none or var.value.source_presets.startswith('[')) else var.value.source_presets }}"
        details_fgb_file_path = join(workdir,f'{pmtiles_base_name}_details.fgb')
        task_dump_details_fgb = Ogr2ogrDumpOperator(
            task_id = "dump_details_fgb",
            container_name = "airflow-dump_details",
            dag = self,
            task_group=group_vector_tiles,
            postgres_conn_id = local_db_conn_id,
            dest_format = "FlatGeobuf",
            dest_path = details_fgb_file_path,
            query = "SELECT * FROM owmf.details_dump",
            doc_md=    """
# FlatGeobuf dump

Dump all the elements from the local DB with their respective linked entities into a FlatGeobuf file
"""
        )
        task_check_dump >> task_dump_details_fgb

        boundaries_fgb_file_path = join(workdir,f'{pmtiles_base_name}_boundaries.fgb')
        task_dump_boundaries_fgb = Ogr2ogrDumpOperator(
            task_id = "dump_boundaries_fgb",
            container_name = "airflow-dump_boundaries",
            dag = self,
            task_group=group_vector_tiles,
            postgres_conn_id = local_db_conn_id,
            dest_format = "FlatGeobuf",
            dest_path = boundaries_fgb_file_path,
            query = "SELECT * FROM owmf.boundaries_dump",
            doc_md=    """
# FlatGeobuf dump

Dump all the elements from the local DB with their respective linked entities into a FlatGeobuf file
"""
        )
        task_check_dump >> task_dump_boundaries_fgb

        task_check_pmtiles = ShortCircuitOperator(
            task_id = "check_pmtiles",
            python_callable = lambda **context: context["params"].get(GENERATE_PMTILES, DEFAULT_GENERATE_PMTILES),
            dag = self,
            task_group = group_vector_tiles,
            doc_md="Check whether pmtiles should be generated"
        )
        task_check_dump >> task_check_pmtiles

        # https://github.com/felt/tippecanoe?tab=readme-ov-file#show-countries-at-low-zoom-levels-but-states-at-higher-zoom-levels
        # https://github.com/felt/tippecanoe?tab=readme-ov-file#discontinuous-polygon-features-buildings-of-rhode-island-visible-at-all-zoom-levels
        # https://github.com/felt/tippecanoe?tab=readme-ov-file#dropping-a-fixed-fraction-of-features-by-zoom-level
        details_pmtiles_file_path = join(workdir,f'{pmtiles_base_name}_details.pmtiles')
        task_generate_details_pmtiles = TippecanoeOperator(
            task_id = "generate_details_pmtiles",
            container_name = "airflow-generate_details",
            dag = self,
            task_group = group_vector_tiles,
            input_file = details_fgb_file_path,
            output_file = details_pmtiles_file_path,
            layer_name = PMTILES_LAYER_NAME,
            min_zoom = 12,
            # When changing the max zoom, change also the vector tile source max zoom in the frontend
            # See https://gis.stackexchange.com/a/330575/196469
            # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/src/EtymologyMap.ts
            max_zoom = 12,
            extra_params = "--force",
            doc_md = dedent(TippecanoeOperator.__doc__)
        )
        [task_check_pmtiles, task_dump_details_fgb] >> task_generate_details_pmtiles

        boundaries_pmtiles_file_path = join(workdir,f'{pmtiles_base_name}_boundaries.pmtiles')
        task_generate_boundaries_pmtiles = TippecanoeOperator(
            task_id = "generate_boundaries_pmtiles",
            container_name = "airflow-generate_boundaries",
            dag = self,
            task_group = group_vector_tiles,
            input_file = boundaries_fgb_file_path,
            output_file = boundaries_pmtiles_file_path,
            layer_name = PMTILES_LAYER_NAME,
            min_zoom = 1,
            # When changing the max zoom, change also the vector tile source max zoom in the frontend
            # See https://gis.stackexchange.com/a/330575/196469
            # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/src/EtymologyMap.ts
            max_zoom = 11,
            extra_params = "--force", # Not using --drop-densest-as-needed as it causes some countries to be dropped
            doc_md = dedent(TippecanoeOperator.__doc__)
        )
        [task_check_pmtiles, task_dump_boundaries_fgb] >> task_generate_boundaries_pmtiles

        pmtiles_file_name = f"{pmtiles_base_name}.pmtiles"
        pmtiles_file_path = join(workdir,pmtiles_file_name)
        task_join_pmtiles = TileJoinOperator(
            task_id = "join_pmtiles",
            container_name = "airflow-join_pmtiles",
            dag = self,
            task_group = group_vector_tiles,
            input_files = [details_pmtiles_file_path, boundaries_pmtiles_file_path],
            output_file = pmtiles_file_path,
            layer_name = PMTILES_LAYER_NAME,
            extra_params = "--force",
            doc_md = dedent(TippecanoeOperator.__doc__)
        )
        [task_generate_boundaries_pmtiles, task_generate_details_pmtiles] >> task_join_pmtiles

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

        group_upload_s3 = TaskGroup("upload_tiles_to_s3", tooltip="Upload elaborated tiles to the S3 bucket", dag=self)

        task_check_pmtiles_upload_conn_id = ShortCircuitOperator(
           task_id = "check_pmtiles_upload_conn_id",
           python_callable=check_s3_conn_id,
           op_kwargs = {
               "conn_id": upload_s3_conn_id,
               "base_s3_uri_var_id": upload_s3_bucket_var_id,
           },
           dag = self,
           task_group = group_upload_s3,
           doc_md = dedent(check_s3_conn_id.__doc__)
        )
        task_join_pmtiles >> task_check_pmtiles_upload_conn_id

        task_upload_pmtiles_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_pmtiles_to_s3",
            dag = self,
            filename = pmtiles_file_path,
            dest_key = f"{base_s3_uri}/{pmtiles_file_name}",
            replace = True,
            aws_conn_id = upload_s3_conn_id,
            task_group = group_upload_s3,
            doc_md = """
# Upload the PMTiles file to AWS S3

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        task_check_pmtiles_upload_conn_id >> task_upload_pmtiles_s3

        task_dataset_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_dataset_to_s3",
            dag = self,
            filename = dataset_path,
            dest_key = f'{base_s3_uri}/dataset.csv',
            replace = True,
            aws_conn_id = upload_s3_conn_id,
            task_group = group_upload_s3,
            doc_md = """
# Upload dataset to S3

Upload the dataset CSV file to AWS S3.

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        [task_upload_pmtiles_s3, task_dump_dataset] >> task_dataset_s3

        task_upload_date_s3 = LocalFilesystemToS3Operator(
            task_id = "upload_date_pmtiles_to_s3",
            dag = self,
            filename = "{{ ti.xcom_pull(task_ids='choose_load_osm_data_method', key='date_file_path') }}",
            dest_key = f'{base_s3_uri}/date.txt',
            replace = True,
            aws_conn_id = upload_s3_conn_id,
            task_group = group_upload_s3,
            doc_md = """
# Upload PMTiles date to S3

Upload the date file for PMTiles to AWS S3.

Links:
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/transfer/local_to_s3.html)
* [LocalFilesystemToS3Operator documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/8.10.0/_api/airflow/providers/amazon/aws/transfers/local_to_s3/index.html#airflow.providers.amazon.aws.transfers.local_to_s3.LocalFilesystemToS3Operator)
* [AWS connection documentation](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/connections/aws.html)
"""
        )
        task_upload_pmtiles_s3 >> task_upload_date_s3
        
        group_upload_db = TaskGroup("upload_to_remote_db", tooltip="Upload elaborated data to the remote DB", dag=self)

        task_check_pg_restore = ShortCircuitOperator(
            task_id = "check_upload_conn_id",
            python_callable=check_postgres_conn_id,
            op_kwargs = {
                "conn_id": upload_db_conn_id,
                "require_upload": True,
            },
            dag = self,
            task_group = group_upload_db,
            doc_md = dedent(check_postgres_conn_id.__doc__)
        )
        task_join_post_elaboration >> task_check_pg_restore
        
        task_pg_dump = BashOperator(
            task_id = "pg_dump",
            trigger_rule = TriggerRule.NONE_FAILED,
            bash_command='pg_dump --file="$backupFilePath" --host="$host" --port="$port" --dbname="$dbname" --username="$user" --no-password --format=c --blobs --section=pre-data --section=data --section=post-data --schema="owmf" --verbose --no-owner --no-privileges --no-tablespaces',
            env= {
                "backupFilePath": join(workdir,"db.backup"),
                "host": f'{{{{ conn.get("{local_db_conn_id}").host }}}}',
                "port": f'{{{{ (conn.get("{local_db_conn_id}").port)|string }}}}',
                "user": f'{{{{ conn.get("{local_db_conn_id}").login }}}}',
                "dbname": f'{{{{ conn.get("{local_db_conn_id}").schema }}}}',
                "PGPASSWORD": f'{{{{ conn.get("{local_db_conn_id}").password }}}}',
            },
            dag = self,
            task_group=group_upload_db,
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
            conn_id = upload_db_conn_id,
            sql = "sql/01-setup-db-extensions.sql",
            dag = self,
            task_group = group_upload_db,
            doc_md = """
# Setup the necessary extensions on the remote DB

Setup PostGIS and HSTORE on the remote DB configured in upload_db_conn_id if they are not already set up.
"""
        )
        task_pg_dump >> task_setup_db_ext

        task_prepare_upload = SQLExecuteQueryOperator(
            task_id = "prepare_db_for_upload",
            conn_id = upload_db_conn_id,
            sql = "sql/15-prepare-db-for-upload.sql",
            dag = self,
            task_group = group_upload_db,
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
                "host": f'{{{{ conn.get("{upload_db_conn_id}").host }}}}',
                "port": f'{{{{ (conn.get("{upload_db_conn_id}").port)|string }}}}',
                "user": f'{{{{ conn.get("{upload_db_conn_id}").login }}}}',
                "dbname": f'{{{{ conn.get("{upload_db_conn_id}").schema }}}}',
                "PGPASSWORD": f'{{{{ conn.get("{upload_db_conn_id}").password }}}}',
            },
            dag = self,
            task_group = group_upload_db,
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
