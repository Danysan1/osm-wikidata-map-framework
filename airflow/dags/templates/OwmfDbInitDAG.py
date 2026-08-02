from datetime import timedelta
from os.path import abspath, dirname, join

from airflow.models.taskinstance import TaskInstance
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.sensors.time_delta import TimeDeltaSensor
from airflow.sdk import (Asset, Param, TaskGroup, TriggerRule, dag,
                         get_current_context, task)
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
PMTILES_LAYER_NAME = "detail"  # If you need to change this, remember to change also the corresponding front-end constant (in OwmfMap.tsx)

DEFAULT_DAYS_BEFORE_CLEANUP = 1


def get_absolute_path(filename: str, folder: str | None = None) -> str:
    file_dir_path = dirname(abspath(__file__))
    if folder != None:
        file_dir_path = join(file_dir_path, folder)
    return join(file_dir_path, filename)


def OwmfDbInitDAG(
    prefix: str,
    days_before_cleanup: int = DEFAULT_DAYS_BEFORE_CLEANUP,
    **kwargs
):
    """
    Apache Airflow DAG for OSM-Wikidata Map Framework DB initialization.
    Triggered on the availability of the PG tab-separated-values file ready for importing into the DB.

    Keyword arguments:
    ----------
    prefix: str
        prefix to search in the PBF filename
    days_before_cleanup: int
        number of days to wait before cleaning up the DAG run temporary folder

    """

    # https://airflow.apache.org/docs/apache-airflow/3.3.0/authoring-and-scheduling/timezone.html
    # https://pendulum.eustace.io/docs/#instantiation
    start_date = datetime(year=2022, month=9, day=15, tz='local')

    base_file_path = f'/workdir/{prefix}/{prefix}.filtered.osm'  # .pbf / pbf.date.txt / .pg / .pg.date.txt

    # URI of the input Airflow asset file for the DAG
    pg_asset = Asset(f'file://{base_file_path}.pg')

    # Shared directory with the Wikidata entity-link CSV pages downloaded by OwmfDownloadWikidataDAG.
    # This DAG consumes the corresponding asset and loads the pages from here.
    wikidata_dir = join("/workdir", prefix, "wikidata")
    wikidata_asset = Asset(f'file://{wikidata_dir}')

    tiles_dir = join("/workdir", prefix, "tiles")
    pmtiles_path = join(tiles_dir, "tiles.pmtiles")
    tiles_date_path = join(tiles_dir, "date.txt")
    dataset_path = join(tiles_dir, "dataset.csv")
    tiles_asset = Asset(f'file://{tiles_dir}')

    # Path to the temporary folder where the DAG will store the intermediate files
    workdir = join("/workdir", prefix, "{{ ti.dag_id }}", "{{ ti.run_id }}")

    local_db_conn_id = f"{prefix}_local_postgis_db"

    default_params = ParamsDict({
        LOAD_ON_DB_METHOD: Param(type="string", enum=["osmium", "osm2pgsql", "imposm"], default=DEFAULT_LOAD_ON_DB_METHOD),
        DROP_TEMPORARY_TABLES: DEFAULT_DROP_TEMPORARY_TABLES,
        GENERATE_PMTILES: DEFAULT_GENERATE_PMTILES,
    })

    @dag(
        start_date=start_date,
        catchup=False,
        schedule=[pg_asset, wikidata_asset],
        tags=['owmf', prefix, 'owmf-db-init', 'consumes'],
        params=default_params,
        **kwargs
    )
    def owmf_db_init():
        """
        # OSM-Wikidata Map Framework DB initialization

        * ingests filtered OSM PBF data
        * downloads relevant Wikidata data
        * combines OSM and Wikidata data
        * exports the output to PMTiles.

        Documentation in the task descriptions and in [README.md](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/airflow).
        """

#region prepare_db
        with TaskGroup("prepare_db", tooltip="Prepare the DB") as db_prepare_group:
            @task.short_circuit
            def check_local_conn_id(conn_id: str) -> bool:
                """
                # Check DB connection ID

                Check whether the connection ID to the DB is available: if it is, proceed, otherwise stop here.

                The connection ID is passed through the params object to allow customization when triggering the DAG.

                Links:
                * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=shortcircuitoperator#airflow.providers.standard.operators.python.ShortCircuitOperator)
                * [ShortCircuitOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/howto/operator/python.html#shortcircuitoperator)
                * [Parameter documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/concepts/params.html)
                """
                from airflow.providers.postgres.hooks.postgres import \
                    PostgresHook

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
                    raise KeyError(f"Airflow DB connection ID is NOT available: '{conn_id}'") from e
                except Exception as e:
                    raise Exception(f"Failed connecting to DB connection ID: '{conn_id}'") from e

                print(f"DB connection ID ('{conn_id}') is available")
                return True
            task_check_pg_local = check_local_conn_id(local_db_conn_id)

            task_setup_db_ext = SQLExecuteQueryOperator(
                task_id="setup_db_extensions",
                conn_id=local_db_conn_id,
                sql="sql/01-setup-db-extensions.sql",
                doc_md="""
# Setup the necessary extensions on the local DB

Setup PostGIS and HSTORE on the local Postgres DB if they are not already set up.
"""
            )
            task_check_pg_local >> task_setup_db_ext

            task_setup_schema = SQLExecuteQueryOperator(
                task_id="setup_schema",
                conn_id=local_db_conn_id,
                sql="sql/03-setup-schema.sql",
                doc_md="""
# Setup the OWMF DB schema

Reset the schema 'owmf' on the local PostGIS DB, then set it up from scratch.
"""
            )
            task_setup_db_ext >> task_setup_schema
#endregion

#region load_data_on_db
        with TaskGroup("load_data_on_db", prefix_group_id=False, tooltip="Load the data on the DB") as group_db_load:
            db_prepare_group >> group_db_load

            @task.branch
            def choose_load_osm_data_method(base_file_path: str, ti: TaskInstance | None = None) -> str:
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
                context = get_current_context()
                params = context["params"] if "params" in context else {}
                load_on_db_method = params.get(LOAD_ON_DB_METHOD, DEFAULT_LOAD_ON_DB_METHOD)
                if load_on_db_method == "osmium":
                    osm_date_path = f"{base_file_path}.pg.date.txt"
                    next_task = "load_elements_from_pg_file"
                elif load_on_db_method == "osm2pgsql":
                    osm_date_path = f"{base_file_path}.pbf.date.txt"
                    next_task = "load_elements_with_osm2pgsql"
                elif load_on_db_method == "imposm":
                    osm_date_path = f"{base_file_path}.pbf.date.txt"
                    next_task = "load_elements_with_imposm"
                else:
                    raise Exception(f"Unknown load_on_db_method: '{load_on_db_method}'")

                if ti is not None:
                    ti.xcom_push(key="osm_date_file_path", value=osm_date_path)

                return next_task
            task_osmium_or_osm2pgsql = choose_load_osm_data_method(base_file_path)

            @task
            def load_elements_from_pg_file(conn_id: str, filepath: str, separator: str, schema: str, table: str, columns: list) -> None:
                """
                # Load OSM data from the PG file

                Load the filtered OpenStreetMap data from the PG tab-separated-values file to the `osmdata` table of the local PostGIS DB.
                """
                from airflow.providers.postgres.hooks.postgres import \
                    PostgresHook

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
            task_load_ele_pg = load_elements_from_pg_file(
                conn_id=local_db_conn_id,
                filepath=f"{base_file_path}.pg",
                separator='\t',
                schema='owmf',
                table='osmdata',
                columns=["osm_id", "osm_geometry", "osm_osm_type", "osm_osm_id", "osm_tags"],
            )
            [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_pg

            task_load_ele_imposm = EmptyOperator(
                task_id="load_elements_with_imposm",
                doc_md="""
# Load OSM data from the PBF file using imposm

*NOT YET IMPLEMENTED!!*

Using `imposm`, load the filtered OpenStreetMap data directly from the PBF file.
"""
            )
            [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_imposm

            task_load_ele_osm2pgsql = Osm2pgsqlOperator(
                task_id="load_elements_with_osm2pgsql",
                container_name="airflow-load_elements_with_osm2pgsql",
                postgres_conn_id=local_db_conn_id,
                source_path=f"{base_file_path}.pbf",
                doc_md="""
# Load OSM data from the PBF file using osm2pgsql

Using `osm2pgsql`, load the filtered OpenStreetMap data directly from the PBF file.
"""
            )
            [task_osmium_or_osm2pgsql, task_setup_schema] >> task_load_ele_osm2pgsql

            task_convert_osm2pgsql = SQLExecuteQueryOperator(
                task_id="convert_osm2pgsql_data",
                conn_id=local_db_conn_id,
                sql="sql/04-convert-osm2pgsql-data.sql",
                doc_md="""
# Prepare osm2pgsql data for usage

Convert OSM data loaded on the local PostGIS DB from `osm2pgsql`'s `planet_osm_*` tables to the standard `osmdata` table.
"""
            )
            task_load_ele_osm2pgsql >> task_convert_osm2pgsql

            join_post_load_ele = EmptyOperator(
                task_id="join_post_load_ele",
                trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
                doc_md="Dummy task for joining the path after the branching done to choose between DB load methods."
            )
            [task_load_ele_pg, task_convert_osm2pgsql, task_load_ele_imposm] >> join_post_load_ele
#endregion

#region elaborate_data
        with TaskGroup("elaborate_data", tooltip="Elaborate data inside the DB") as elaborate_group:
            group_db_load >> elaborate_group

            task_remove_ele_too_big = SQLExecuteQueryOperator(
                task_id="remove_elements_too_big",
                conn_id=local_db_conn_id,
                sql=["sql/05-remove-elements-too-big.sql", "sql/05-reset-osmdata-sequence.sql"],
                parameters={
                    "osm_key": "{{ var.json.osm_wikidata_keys[0] or '' }}"
                },
                doc_md="""
# Remove remaining non interesting elements

Remove from the local PostGIS DB elements that aren't interesting and that it wasn't possible to remove during the filtering phase:
* elements too big that wouldn't be visible anyway on the map
* elements that have a wrong etymology (*:wikidata and wikidata values are equal)
"""
            )
            join_post_load_ele >> task_remove_ele_too_big

            task_create_key_index = SQLExecuteQueryOperator(
                task_id="create_key_index",
                conn_id=local_db_conn_id,
                sql="sql/06-create-key-index.sql",
                doc_md="""
# Create the indexes on `osmdata`

Creates the indexes on the `osmdata` table, necessary for the next elaboration steps
"""
            )
            task_remove_ele_too_big >> task_create_key_index

            task_convert_ele_wd_cods = SQLExecuteQueryOperator(
                task_id="convert_element_wikidata_cods",
                conn_id=local_db_conn_id,
                sql="sql/07-convert-element-wikidata-cods.jinja.sql",
                doc_md="""
# Convert OSM - Wikidata associations

Fill the element_wikidata_cods table with OSM element <-> Wikidata Q-ID ("code") associations obtained from OSM elements, specifying for each association the source (`wikidata` / `*:wikidata`).

Links:
* [`wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata)
* [`*:wikidata=*` documentation](https://wiki.openstreetmap.org/wiki/Key:wikidata#Secondary_Wikidata_links)
"""
            )
            task_create_key_index >> task_convert_ele_wd_cods

            task_convert_wd_ent = SQLExecuteQueryOperator(
                task_id="convert_wikidata_entities",
                conn_id=local_db_conn_id,
                sql="sql/08-convert-wikidata-entities.sql",
                doc_md="""
# Load Wikidata entities from OSM tags

Load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that are referenced from configured OSM secondary Wikidata tags (`*:wikidata`).
"""
            )
            task_convert_ele_wd_cods >> task_convert_wd_ent

            task_convert_linked_entities = SQLExecuteQueryOperator(
                task_id="convert_linked_entities",
                conn_id=local_db_conn_id,
                sql="sql/09-convert-etymologies.sql",
                doc_md="""
# Convert the linked entities

Fill the `etymology` table of the local PostGIS DB with the linked entities derived from the `element_wikidata_cods` table.
"""
            )
            task_convert_wd_ent >> task_convert_linked_entities
#endregion

#region load_wikidata
        # The Wikidata data is downloaded by the separate OwmfDownloadWikidataDAG and published in `wikidata_dir`; here it is only loaded into the local DB
        @task
        def load_wikidata_entities(workdir: str, postgres_conn_id: str) -> None:
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
        task_load_wd = load_wikidata_entities(wikidata_dir, local_db_conn_id)
        task_convert_linked_entities >> task_load_wd
#endregion

#region propagate
        with TaskGroup("propagate", tooltip="Propagate linked entities", prefix_group_id=False) as propagate_group:
            @task.branch(trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS)
            def choose_propagation_method(propagate_data: str) -> str:
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
            task_check_propagation = choose_propagation_method('{{ var.value.propagate_data }}')
            task_load_wd >> task_check_propagation

            task_propagate_globally = SQLExecuteQueryOperator(
                task_id="propagate_etymologies_globally",
                conn_id=local_db_conn_id,
                sql="sql/11-propagate-etymologies-global.sql",
                doc_md="""
# Propagate the linked entities by name

Check the reliable linked entities (where multiple case-insensitive homonymous elements have linked entities to the exactly the same Wikidata entity).
Then propagate reliable linked entities to case-insensitive homonymous elements that don't have any etymology.
"""
            )
            task_check_propagation >> task_propagate_globally

            task_propagate_locally = SQLExecuteQueryOperator(
                task_id="propagate_etymologies_locally",
                conn_id=local_db_conn_id,
                sql="sql/11-propagate-etymologies-global.sql",
            )
            task_check_propagation >> task_propagate_locally

            join_post_propagation = EmptyOperator(
                task_id="join_post_propagation",
                trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
                doc_md="""
# Join branches back together

Dummy task for joining the path after the branching
"""
            )
            [task_check_propagation, task_propagate_locally, task_propagate_globally] >> join_post_propagation
#endregion

#region post_elaboration
        with TaskGroup("post_elaboration", tooltip="Actions after data elaboration") as post_elaborate_group:
            propagate_group >> post_elaborate_group

            task_create_work_dir = BashOperator(
                task_id="create_work_dir",
                bash_command='mkdir -p "$workdir" && mkdir -p "$tiles_dir"',
                env={"workdir": workdir, "tiles_dir": tiles_dir},
            )

            task_move_ele = SQLExecuteQueryOperator(
                task_id="move_elements_with_etymology",
                conn_id=local_db_conn_id,
                sql="sql/12-move-elements-with-etymology.sql",
                doc_md="""
# Remove elements without any etymology

Move only elements with an etymology from the `osmdata` temporary table of the local PostGIS DB to the `element` table.
"""
            )
            join_post_propagation >> task_move_ele

            task_setup_ety_fk = SQLExecuteQueryOperator(
                task_id="setup_etymology_foreign_key",
                conn_id=local_db_conn_id,
                sql="sql/13-etymology-foreign-key.sql",
                doc_md="""
# Apply the foreign key from etymology to wikidata
"""
            )
            task_move_ele >> task_setup_ety_fk

            task_create_source_index = SQLExecuteQueryOperator(
                task_id="create_source_index",
                conn_id=local_db_conn_id,
                sql="sql/14-create-source-index.sql",
                doc_md="""
# Create the indexes on `etymology`

Creates the indexes on the `etymology` table, necessary for the runtime queries
"""
            )
            task_setup_ety_fk >> task_create_source_index

            @task.short_circuit
            def check_whether_to_drop_temporary_tables() -> bool:
                """
                # Check whether to drop temporary tables

                Check whether to remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate linked entities.

                Links:
                * [BranchPythonOperator documentation](https://airflow.apache.org/docs/apache-airflow/2.6.0/_api/airflow/operators/python/index.html?highlight=branchpythonoperator#airflow.providers.standard.operators.python.BranchPythonOperator)
                """
                context = get_current_context()
                params = context["params"] if "params" in context else {}
                return params.get(DROP_TEMPORARY_TABLES, DEFAULT_DROP_TEMPORARY_TABLES)
            task_check_whether_to_drop = check_whether_to_drop_temporary_tables()
            task_setup_ety_fk >> task_check_whether_to_drop

            task_drop_temp_tables = SQLExecuteQueryOperator(
                task_id="drop_temporary_tables",
                conn_id=local_db_conn_id,
                sql="sql/13-drop-temp-tables.sql",
                doc_md="""
    # Remove temporary tables

    Remove from the local PostGIS DB all temporary tables used in previous tasks to elaborate linked entities.
"""
            )
            task_check_whether_to_drop >> task_drop_temp_tables

            task_backend_views = SQLExecuteQueryOperator(
                task_id="setup_backend_views",
                conn_id=local_db_conn_id,
                sql="sql/13-backend-views.jinja.sql",
                doc_md="""
# Save the global map view

Create in the local PostGIS DB the materialized view used for the clustered view at very low zoom level.
"""
            )
            task_setup_ety_fk >> task_backend_views

            task_dataset_view = SQLExecuteQueryOperator(
                task_id="setup_dataset_view",
                conn_id=local_db_conn_id,
                sql="sql/13-dataset-view.sql",
                doc_md="""
# Save the dataset view

Create in the local PostGIS DB the materialized view used for the dataset download.
"""
            )
            task_setup_ety_fk >> task_dataset_view

            task_join_post_elaboration = EmptyOperator(
                task_id="join_post_elaboration",
                trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
            )
            [task_create_source_index, task_drop_temp_tables, task_backend_views, task_dataset_view, task_create_work_dir] >> task_join_post_elaboration
#endregion

#region vector_tiles
        with TaskGroup("vector_tiles", tooltip="Generate the vector tiles and/or PMTiles") as group_vector_tiles:
            post_elaborate_group >> group_vector_tiles

            @task.short_circuit
            def check_dump() -> bool:
                """Check whether data should be dumped to FlatGeobuf for vector tiles and/or PMTiles generation"""
                context = get_current_context()
                params = context["params"] if "params" in context else {}
                return params.get(GENERATE_PMTILES, DEFAULT_GENERATE_PMTILES)
            task_check_dump = check_dump()
            task_join_post_elaboration >> task_check_dump

            details_fgb_file_path = join(workdir, 'details.fgb')
            task_dump_details_fgb = Ogr2ogrDumpOperator(
                task_id="dump_details_fgb",
                container_name="airflow-dump_details",
                postgres_conn_id=local_db_conn_id,
                dest_format="FlatGeobuf",
                dest_path=details_fgb_file_path,
                query="SELECT * FROM owmf.details_dump",
                doc_md="""
# FlatGeobuf dump

Dump all the elements from the local DB with their respective linked entities into a FlatGeobuf file
"""
            )
            task_check_dump >> task_dump_details_fgb

            boundaries_fgb_file_path = join(workdir, 'boundaries.fgb')
            task_dump_boundaries_fgb = Ogr2ogrDumpOperator(
                task_id="dump_boundaries_fgb",
                container_name="airflow-dump_boundaries",
                postgres_conn_id=local_db_conn_id,
                dest_format="FlatGeobuf",
                dest_path=boundaries_fgb_file_path,
                query="SELECT * FROM owmf.boundaries_dump",
                doc_md="""
# FlatGeobuf dump

Dump all the elements from the local DB with their respective linked entities into a FlatGeobuf file
"""
            )
            task_check_dump >> task_dump_boundaries_fgb

            @task.short_circuit
            def check_pmtiles() -> bool:
                """Check whether pmtiles should be generated"""
                context = get_current_context()
                params = context["params"] if "params" in context else {}
                return params.get(GENERATE_PMTILES, DEFAULT_GENERATE_PMTILES)
            task_check_pmtiles = check_pmtiles()
            task_check_dump >> task_check_pmtiles

            # https://github.com/felt/tippecanoe?tab=readme-ov-file#show-countries-at-low-zoom-levels-but-states-at-higher-zoom-levels
            # https://github.com/felt/tippecanoe?tab=readme-ov-file#discontinuous-polygon-features-buildings-of-rhode-island-visible-at-all-zoom-levels
            # https://github.com/felt/tippecanoe?tab=readme-ov-file#dropping-a-fixed-fraction-of-features-by-zoom-level
            details_pmtiles_file_path = join(workdir, 'details.pmtiles')
            task_generate_details_pmtiles = TippecanoeOperator(
                task_id="generate_details_pmtiles",
                container_name="airflow-generate_details",
                input_file=details_fgb_file_path,
                output_file=details_pmtiles_file_path,
                layer_name=PMTILES_LAYER_NAME,
                min_zoom=12,
                # When changing the max zoom, change also the vector tile layers CITY_MAX_ZOOM in the frontend
                # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/front-end/src/components/map/DetailsLayers.tsx
                max_zoom=12,
                extra_params="--force",
                doc_md=TippecanoeOperator.__doc__ or ""
            )
            [task_check_pmtiles, task_dump_details_fgb] >> task_generate_details_pmtiles

            boundaries_pmtiles_file_path = join(workdir, 'boundaries.pmtiles')
            task_generate_boundaries_pmtiles = TippecanoeOperator(
                task_id="generate_boundaries_pmtiles",
                container_name="airflow-generate_boundaries",
                input_file=boundaries_fgb_file_path,
                output_file=boundaries_pmtiles_file_path,
                layer_name=PMTILES_LAYER_NAME,
                min_zoom=1,
                # When changing the max zoom, change also the vector tile layers CITY_MAX_ZOOM in the frontend
                # See https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/blob/main/front-end/src/components/map/DetailsLayers.tsx
                max_zoom=11,
                extra_params="--force",  # Not using --drop-densest-as-needed as it causes some countries to be dropped
                doc_md=TippecanoeOperator.__doc__ or ""
            )
            [task_check_pmtiles, task_dump_boundaries_fgb] >> task_generate_boundaries_pmtiles

            task_join_pmtiles = TileJoinOperator(
                task_id="join_pmtiles",
                container_name="airflow-join_pmtiles",
                input_files=[details_pmtiles_file_path, boundaries_pmtiles_file_path],
                output_file=pmtiles_path,
                layer_name=PMTILES_LAYER_NAME,
                extra_params="--force",
                doc_md=TippecanoeOperator.__doc__ or ""
            )
            [task_generate_boundaries_pmtiles, task_generate_details_pmtiles] >> task_join_pmtiles

            @task
            def dump_dataset(conn_id: str, filepath: str, separator: str, schema: str, table: str) -> None:
                """Dump the content of the dataset view into a CSV file"""
                import csv

                from airflow.providers.postgres.hooks.postgres import \
                    PostgresHook

                pg_hook = PostgresHook(conn_id)
                with pg_hook.get_conn() as pg_conn:
                    with pg_conn.cursor() as cursor:
                        with open(filepath, "w", encoding="utf-8") as file:
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
            task_dump_dataset = dump_dataset(
                conn_id=local_db_conn_id,
                filepath=dataset_path,
                separator=',',
                schema='owmf',
                table='vm_dataset',
            )
            task_check_pmtiles >> task_dump_dataset

            task_copy_tiles_date = BashOperator(
                task_id="copy_tiles_date",
                bash_command='cp "$osm_date_path" "$tiles_date_path"',
                env={
                    "tiles_date_path": tiles_date_path,
                    "osm_date_path": "{{ ti.xcom_pull(task_ids='choose_load_osm_data_method', key='osm_date_file_path') }}"
                },
                outlets=tiles_asset,
                doc_md="Dump the content of the dataset view into a CSV file"
            )
            [task_join_pmtiles, task_dump_dataset] >> task_copy_tiles_date
#endregion

#region cleanup
        with TaskGroup("cleanup", tooltip="Cleanup the DAG temporary files") as group_cleanup:
            post_elaborate_group >> group_cleanup

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
            task_join_post_elaboration >> task_wait_cleanup

            task_cleanup = BashOperator(
                task_id="cleanup",
                bash_command='rm -r "$workdir"',
                env={"workdir": workdir},
                doc_md="""
# Cleanup the work directory

Remove the DAG run folder
"""
            )
            task_wait_cleanup >> task_cleanup
#endregion

    return owmf_db_init()
