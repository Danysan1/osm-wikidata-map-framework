from datetime import timedelta
from os.path import abspath, dirname, join
from textwrap import dedent

from airflow.providers.common.compat.sdk import TriggerRule
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.python import (BranchPythonOperator,
                                                         PythonOperator,
                                                         ShortCircuitOperator)
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import DAG, Asset, Param, TaskGroup
from airflow.sdk.definitions.param import ParamsDict
from airflow.sdk.exceptions import AirflowNotFoundException
from operators.Ogr2ogrDumpOperator import Ogr2ogrDumpOperator
from operators.Osm2pgsqlOperator import Osm2pgsqlOperator
from operators.TileJoinOperator import TileJoinOperator
from operators.TippecanoeOperator import TippecanoeOperator
from pendulum import datetime
from utils.wikidata import ENTITY_LINK_CSV_COLUMNS, read_query

LOAD_ON_DB_METHOD = "load_on_db_method"
DEFAULT_LOAD_ON_DB_METHOD = "osmium"
COPY_BLOCK_SIZE = 8192

DROP_TEMPORARY_TABLES = "drop_temporary_tables"
DEFAULT_DROP_TEMPORARY_TABLES = True

GENERATE_PMTILES = "generate_pmtiles"
DEFAULT_GENERATE_PMTILES = True
PMTILES_LAYER_NAME = "detail" # If you need to change this, remember to change also the corresponding front-end constant (in OwmfMap.tsx)

DEFAULT_DAYS_BEFORE_CLEANUP = 1

def get_absolute_path(filename:str, folder:str|None = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)

def load_entities(workdir:str, postgres_conn_id: str) -> None:
    """
    Callable that loads Wikidata entities into the local PostGIS DB.

    Loads every entity-link CSV page published by OwmfDownloadWikidataDAG (see
    utils.wikidata.ENTITY_LINK_CSV_COLUMNS) into the owmf.wikidata_staging table with a plain
    COPY, then converts the staged rows into the final wikidata/osmdata/etymology tables.
    """
    from glob import glob

    from airflow.providers.postgres.hooks.postgres import PostgresHook

    csv_paths = sorted(glob(join(workdir, "*.csv")))
    if not csv_paths:
        raise Exception(f"No Wikidata entity-link CSV page found in {workdir}")

    staging_columns = [f"ws_{column}" for column in ENTITY_LINK_CSV_COLUMNS]

    # Read SQL templates
    wikidata_sql = read_query("load-related-wikidata.sql")
    element_update_sql = read_query("load-related-element-update.sql")
    element_insert_sql = read_query("load-related-element-insert.sql")
    entities_sql = read_query("load-related-direct-entities.sql")

    staging_copy_sql = f"COPY owmf.wikidata_staging ({','.join(staging_columns)}) FROM STDIN WITH (FORMAT CSV)"
    print(f"Loading wikidata staging CSV data with query:\n{staging_copy_sql}")

    # Connect to DB and run as a single transaction
    pg_hook = PostgresHook(postgres_conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            for csv_path in csv_paths:
                print(f"Staging data from {csv_path}")
                with open(csv_path, "r", encoding="utf-8") as csv_file:
                    with cursor.copy(staging_copy_sql) as copy:
                        while data := csv_file.read(COPY_BLOCK_SIZE):
                            copy.write(data)
                print(f"Staged {cursor.rowcount} rows from {csv_path}")

            cursor.execute(wikidata_sql)
            print(f"Loaded {cursor.rowcount} wikidata entities")

            cursor.execute(element_update_sql)
            print(f"Updated {cursor.rowcount} elements")

            cursor.execute(element_insert_sql)
            print(f"Inserted {cursor.rowcount} elements")

            cursor.execute(entities_sql)
            print(f"Loaded {cursor.rowcount} etymology links")

        pg_conn.commit()

    print("Done loading direct related entities")

def postgres_copy_table(conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list) -> None:
    """
    Copy data from a CSV/TSV/... file to a PostgreSQL table

    Uses psycopg (v3)'s cursor.copy(), not psycopg2's cursor.copy_from() (removed in psycopg3).

    See https://www.psycopg.org/psycopg3/docs/basic/copy.html
    """
    from airflow.providers.postgres.hooks.postgres import PostgresHook

    copy_sql = f"COPY {schema}.{table} ({','.join(columns)}) FROM STDIN WITH (DELIMITER '{separator}')"
    print(f"Loading data on DB with query:\n{copy_sql}")

    pg_hook = PostgresHook(conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath, "r", encoding="utf-8") as file:
                with cursor.copy(copy_sql) as copy:
                    while data := file.read(COPY_BLOCK_SIZE):
                        copy.write(data)
            print("Inserted row count:", cursor.rowcount)

def dump_postgres_table(conn_id:str, filepath:str, separator:str, schema:str, table:str) -> None:
    """
    Copy data from a PostgreSQL table to a CSV/TSV/... file

    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_to
    See https://github.com/psycopg/psycopg2/issues/1294
    """
    import csv

    from airflow.providers.postgres.hooks.postgres import PostgresHook

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

def check_postgres_conn_id(conn_id:str, **context) -> bool:
    """
        # Check DB connection ID

        Check whether the connection ID to the DB is available: if it is, proceed, otherwise stop here.

        The connection ID is passed through the params object to allow customization when triggering the DAG.

        Links:
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.providers.standard.operators.python.ShortCircuitOperator)
        * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    from airflow.providers.postgres.hooks.postgres import PostgresHook

    if not conn_id:
        print("DB connection ID not specified, skipping")
        return False

    try:
        pg_hook = PostgresHook(conn_id)
        with pg_hook.get_conn() as pg_conn:
            with pg_conn.cursor() as cursor:
                cursor.execute("SELECT version()")
                postgis_version = cursor.fetchone()
                print(f"conn_id available, PostGIS version {postgis_version}")
    except AirflowNotFoundException as e:
        print(f"DB connection ID ('{conn_id}') is NOT available, skipping. Detailed error:")
        print(e)
        return False
    except Exception as e:
        print(f"Failed connecting to DB connection ID ('{conn_id}'), skipping. Detailed error:")
        print(e)
        return False

    print(f"DB connection ID ('{conn_id}') is available")
    return True

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
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.providers.standard.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
    """
    
    load_on_db_method = context["params"].get(LOAD_ON_DB_METHOD, DEFAULT_LOAD_ON_DB_METHOD)
    if load_on_db_method == "osmium":
        next_task = "load_elements_from_pg_file"
    elif load_on_db_method == "osm2pgsql":
        next_task = "load_elements_with_osm2pgsql"
    elif load_on_db_method == "imposm":
        next_task = "load_elements_with_imposm"
    else:
        raise Exception(f"Unknown load_on_db_method: '{load_on_db_method}'")
    
    return next_task

def choose_propagation_method(propagate_data:str) -> str:
    """
        # Check whether and how to propagate

        Links:
        * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.7.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.providers.standard.operators.python.BranchPythonOperator)
        * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.7.0/concepts/params.html)
    """

    if propagate_data == "global" or propagate_data == "true":
        return "propagate_etymologies_globally"
    elif propagate_data == "local":
        return "propagate_etymologies_locally"
    else:
        return "join_post_propagation"

class OwmfDbInitDAG(DAG):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.
    Triggered on the availability of the PG tab-separated-values file ready for importing into the DB.
    """

    def __init__(self,
            prefix:str,
            days_before_cleanup:int=DEFAULT_DAYS_BEFORE_CLEANUP,
            **kwargs
        ):
        """
        Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.

        Keyword arguments:
        ----------
        prefix: str
            prefix to search in the PBF filename 
        load_on_db_method: string
            choose which tool to use to upload the filtered OSM data
        days_before_cleanup: int
            number of days to wait before cleaning up the DAG run temporary folder

        """

        # https://airflow.apache.org/docs/apache-airflow/3.3.0/authoring-and-scheduling/timezone.html
        # https://pendulum.eustace.io/docs/#instantiation
        start_date = datetime(year=2022, month=9, day=15, tz='local')

        doc_md="""
# OSM-Wikidata Map Framework DB initialization

* ingests filtered OSM PBF data
* downloads relevant Wikidata data
* combines OSM and Wikidata data
* exports the output to PMTiles.

Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
"""

        base_file_path = f'/workdir/{prefix}/{prefix}.filtered.osm' # .pbf / pbf.date.txt / .pg / .pg.date.txt

        # URI of the input Airflow asset file for the DAG
        pg_asset = Asset(f'file://{base_file_path}.pg')

        # Shared directory with the Wikidata entity-link CSV pages downloaded by OwmfDownloadWikidataDAG.
        # This DAG consumes the corresponding asset and loads the pages from here.
        wikidata_dir = join("/workdir", prefix, "wikidata")
        wikidata_asset = Asset(f'file://{wikidata_dir}')

        tiles_dir = join("/workdir", prefix, "tiles")
        pmtiles_path = join(tiles_dir, "tiles.pmtiles")
        date_path = join(tiles_dir, "date.txt")
        dataset_path = join(tiles_dir, "dataset.csv")
        tiles_asset = Asset(f'file://{tiles_dir}')

        # Path to the temporary folder where the DAG will store the intermediate files
        workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

        local_db_conn_id=f"{prefix}_local_postgis_db"

        default_params = ParamsDict({
            LOAD_ON_DB_METHOD: Param(type="string", enum=["osmium","osm2pgsql","imposm"], default=DEFAULT_LOAD_ON_DB_METHOD),
            DROP_TEMPORARY_TABLES: DEFAULT_DROP_TEMPORARY_TABLES,
            GENERATE_PMTILES: DEFAULT_GENERATE_PMTILES,
        })

        super().__init__(
            start_date=start_date,
            catchup=False,
            schedule = [pg_asset, wikidata_asset],
            tags=['owmf', prefix, 'owmf-db-init', 'consumes'],
            params=default_params,
            doc_md = doc_md,
            **kwargs
        )

#region prepare_db
        db_prepare_group = TaskGroup("prepare_db", tooltip="Prepare the DB", dag=self)

        task_check_pg_local = ShortCircuitOperator(
            task_id = "check_local_conn_id",
            python_callable=check_postgres_conn_id,
            op_kwargs = {
                "conn_id": local_db_conn_id,
            },
            dag = self,
            task_group = db_prepare_group,
            doc_md = dedent(check_postgres_conn_id.__doc__ or "")
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
#endregion

#region load_data_on_db
        group_db_load = TaskGroup("load_data_on_db", prefix_group_id=False, tooltip="Load the data on the DB", dag=self)
        db_prepare_group >> group_db_load

        task_osmium_or_osm2pgsql = BranchPythonOperator(
            task_id = "choose_load_osm_data_method",
            python_callable= choose_load_osm_data_task,
            op_kwargs = {
                "base_file_path": base_file_path,
            },
            dag = self,
            task_group=group_db_load,
            doc_md = dedent(choose_load_osm_data_task.__doc__ or "")
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
* [PythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=pythonoperator#airflow.providers.standard.operators.python.PythonOperator)
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
#endregion

#region elaborate_data
        elaborate_group = TaskGroup("elaborate_data", tooltip="Elaborate data inside the DB", dag=self)
        group_db_load >> elaborate_group

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
#endregion

#region load_wikidata
        # The Wikidata data is downloaded by the separate OwmfDownloadWikidataDAG and published in `wikidata_dir`; here it is only loaded into the local DB
        wikidata_group = TaskGroup("load_wikidata", tooltip="Load the downloaded Wikidata data into the DB", prefix_group_id=False, dag=self)

        task_load_wd = PythonOperator(
            task_id = "load_wikidata_entities",
            python_callable = load_entities,
            op_kwargs = {
                "workdir": wikidata_dir,
                "postgres_conn_id": local_db_conn_id,
            },
            dag = self,
            task_group=wikidata_group,
            doc_md = dedent(load_entities.__doc__ or "")
        )
        task_convert_ety >> task_load_wd
#endregion

#region propagate
        propagate_group = TaskGroup("propagate", tooltip="Propagate linked entities", prefix_group_id=False, dag=self)
        [wikidata_group, elaborate_group] >> propagate_group

        task_check_propagation = BranchPythonOperator(
            task_id = "choose_propagation_method",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            python_callable = choose_propagation_method,
            op_kwargs = {
                "propagate_data": '{{ var.value.propagate_data }}',
            },
            dag = self,
            task_group=propagate_group,
            doc_md = dedent(choose_propagation_method.__doc__ or "")
        )
        task_load_wd >> task_check_propagation

        task_propagate_globally = SQLExecuteQueryOperator(
            task_id = "propagate_etymologies_globally",
            conn_id = local_db_conn_id,
            sql = "sql/11-propagate-etymologies-global.sql",
            dag = self,
            task_group=propagate_group,
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
            task_group=propagate_group,
        )
        task_check_propagation >> task_propagate_locally

        join_post_propagation = EmptyOperator(
            task_id = "join_post_propagation",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=propagate_group,
            doc_md="""
# Join branches back together

Dummy task for joining the path after the branching
"""
        )
        [task_check_propagation, task_propagate_locally, task_propagate_globally] >> join_post_propagation
#endregion

#region post_elaboration
        post_elaborate_group = TaskGroup("post_elaboration", tooltip="Actions after data elaboration", dag=self)
        propagate_group >> post_elaborate_group

        task_create_work_dir = BashOperator(
            task_id = "create_work_dir",
            bash_command = 'mkdir -p "$workdir" && mkdir -p "$tiles_dir"',
            env = { "workdir": workdir, "tiles_dir": tiles_dir },
            dag = self,
            task_group = post_elaborate_group,
        )

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
* [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.providers.standard.operators.python.BranchPythonOperator)
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

        task_join_post_elaboration = EmptyOperator(
            task_id = "join_post_elaboration",
            trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            dag = self,
            task_group=post_elaborate_group
        )
        [task_create_source_index, task_drop_temp_tables, task_backend_views, task_dataset_view, join_post_load_ele, task_create_work_dir] >> task_join_post_elaboration
#endregion

#region vector_tiles
        group_vector_tiles = TaskGroup("vector_tiles", tooltip="Generate the vector tiles and/or PMTiles", dag=self)
        post_elaborate_group >> group_vector_tiles

        task_check_dump = ShortCircuitOperator(
            task_id = "check_dump",
            python_callable = lambda **context: context["params"].get(GENERATE_PMTILES, DEFAULT_GENERATE_PMTILES),
            dag = self,
            task_group = group_vector_tiles,
            doc_md="Check whether data should be dumped to FlatGeobuf for vector tiles and/or PMTiles generation"
        )
        task_join_post_elaboration >> task_check_dump

        details_fgb_file_path = join(workdir, 'details.fgb')
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

        boundaries_fgb_file_path = join(workdir, 'boundaries.fgb')
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
        details_pmtiles_file_path = join(workdir, 'details.pmtiles')
        task_generate_details_pmtiles = TippecanoeOperator(
            task_id = "generate_details_pmtiles",
            container_name = "airflow-generate_details",
            dag = self,
            task_group = group_vector_tiles,
            input_file = details_fgb_file_path,
            output_file = details_pmtiles_file_path,
            layer_name = PMTILES_LAYER_NAME,
            min_zoom = 12,
            # When changing the max zoom, change also the vector tile layers CITY_MAX_ZOOM in the frontend
            # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/front-end/src/components/map/DetailsLayers.tsx
            max_zoom = 12,
            extra_params = "--force",
            doc_md = dedent(TippecanoeOperator.__doc__ or "")
        )
        [task_check_pmtiles, task_dump_details_fgb] >> task_generate_details_pmtiles

        boundaries_pmtiles_file_path = join(workdir, 'boundaries.pmtiles')
        task_generate_boundaries_pmtiles = TippecanoeOperator(
            task_id = "generate_boundaries_pmtiles",
            container_name = "airflow-generate_boundaries",
            dag = self,
            task_group = group_vector_tiles,
            input_file = boundaries_fgb_file_path,
            output_file = boundaries_pmtiles_file_path,
            layer_name = PMTILES_LAYER_NAME,
            min_zoom = 1,
            # When changing the max zoom, change also the vector tile layers CITY_MAX_ZOOM in the frontend
            # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/front-end/src/components/map/DetailsLayers.tsx
            max_zoom = 11,
            extra_params = "--force", # Not using --drop-densest-as-needed as it causes some countries to be dropped
            doc_md = dedent(TippecanoeOperator.__doc__ or "")
        )
        [task_check_pmtiles, task_dump_boundaries_fgb] >> task_generate_boundaries_pmtiles

        task_join_pmtiles = TileJoinOperator(
            task_id = "join_pmtiles",
            container_name = "airflow-join_pmtiles",
            dag = self,
            task_group = group_vector_tiles,
            input_files = [details_pmtiles_file_path, boundaries_pmtiles_file_path],
            output_file = pmtiles_path,
            layer_name = PMTILES_LAYER_NAME,
            extra_params = "--force",
            doc_md = dedent(TippecanoeOperator.__doc__ or "")
        )
        [task_generate_boundaries_pmtiles, task_generate_details_pmtiles] >> task_join_pmtiles

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
            doc_md = "Dump the content of the dataset view into a CSV file"
        )
        task_check_pmtiles >> task_dump_dataset

        task_copy_tiles_date = BashOperator(
            task_id = "copy_tiles_date",
            bash_command='echo $last_update > "$date_path"',
            env = {
                "date_path": date_path,
                "last_update": "{{ ti.xcom_pull(task_ids='choose_load_osm_data_method', key='last_data_update') }}"
            },
            outlets = tiles_asset,
            dag = self,
            task_group = group_vector_tiles,
            doc_md = "Dump the content of the dataset view into a CSV file"
        )
        [task_join_pmtiles, task_dump_dataset] >> task_copy_tiles_date
#endregion

#region cleanup
        group_cleanup = TaskGroup("cleanup", tooltip="Cleanup the DAG temporary files", dag=self)
        post_elaborate_group >> group_cleanup

        task_wait_cleanup = TimeDeltaSensor(
            task_id = 'wait_for_cleanup_time',
            delta = timedelta(days=days_before_cleanup),
            trigger_rule = TriggerRule.NONE_SKIPPED,
            deferrable=True,
            dag = self,
            task_group = group_cleanup,
            doc_md = """
# Wait for the time to cleanup the temporary files

Links:
* [TimeDeltaSensor documentation](https://airflow.apache.org/docs/apache-airflow-providers-standard/1.11.0/sensors/datetime.html)
"""
        )
        task_join_post_elaboration >> task_wait_cleanup
    
        task_cleanup = BashOperator(
            task_id = "cleanup",
            bash_command = 'rm -r "$workdir"',
            env = { "workdir": workdir, },
            dag = self,
            task_group = group_cleanup,
            doc_md = """
# Cleanup the work directory

Remove the DAG run folder
"""
        )
        task_wait_cleanup >> task_cleanup
#endregion
