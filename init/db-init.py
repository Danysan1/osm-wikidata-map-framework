import os
from datetime import datetime
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator

def get_absolute_path(filename:str, folder:str = None) -> str:
    file_dir_path = os.path.dirname(os.path.abspath(__file__))
    if folder != None:
        file_dir_path = os.path.join(file_dir_path, folder)
    return os.path.join(file_dir_path, filename)

def read_sql_query(filename:str) -> str:
    """
    See https://airflow.apache.org/docs/apache-airflow/2.1.4/best-practices.html#dynamic-dags-with-external-configuration-from-a-structured-data-file
    """
    sql_file_path = get_absolute_path(filename, 'sql')
    with open(sql_file_path) as sql_file:
        sql_content = sql_file.read()

    return sql_content

def do_postgres_query(conn_id:str, sql_stmt:str, params:dict = None):
    """
    See https://medium.com/towards-data-science/apache-airflow-for-data-science-how-to-work-with-databases-postgres-a4dc79c04cb8
    """
    pg_hook = PostgresHook(conn_id)
    pg_conn = pg_hook.get_conn()
    cursor = pg_conn.cursor()
    cursor.execute(sql_stmt, params)
    return cursor.fetchall()


def postgres_query_from_file(task_id:str, filename:str, conn_id:str, dag:DAG, params:dict = None) -> PythonOperator:
    return PythonOperator(
        task_id = task_id,
        python_callable = do_postgres_query,
        op_kwargs = {
            "conn_id" : conn_id,
            "sql_stmt" : read_sql_query(filename),
            "params" : params
        },
        dag = dag,
    )

def do_postgres_copy(conn_id:str, filepath:str, separator:str, schema:str, table:str, columns:list):
    """
    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_from
    See https://github.com/psycopg/psycopg2/issues/1294
    """
    pg_hook = PostgresHook(conn_id)
    with pg_hook.get_conn() as pg_conn:
        with pg_conn.cursor() as cursor:
            with open(filepath) as file:
                cursor.execute(f'SET search_path TO {schema}')
                cursor.copy_from(file, table, separator, columns = columns)

def postgres_copy_from_file(task_id:str, filepath:str, separator:str, table:str, columns:list, conn_id:str, dag:DAG, schema:str = 'oem') -> PythonOperator:
    return PythonOperator(
        task_id = task_id,
        python_callable = do_postgres_copy,
        op_kwargs = {
            "conn_id": conn_id,
            "filepath": filepath,
            "separator": separator,
            "schema": schema,
            "table": table,
            "columns": columns,
        },
        dag = dag,
    )

def define_db_init_dag(
        dag_id:str, schedule_interval:str, local_db_conn_id:str, upload_db_conn_id:str, source_url:str
    ):
    """
    See https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html
    """

    if not source_url.endswith(".osm.pbf"):
        raise Exception("The source url must be an OSM pbf file")

    # https://linuxhint.com/fetch-basename-python/
    basename = os.path.basename(source_url)
    
    default_args = {
        "source_url" : source_url,
        "upload_db_conn_id" : upload_db_conn_id,
    }

    dag = DAG(
            dag_id = dag_id,
            schedule_interval = schedule_interval,
            start_date=datetime(year=2022, month=2, day=1),
            catchup=False,
            tags=['oem', 'db-init'],
            params=default_args,
        )

    task_download_pbf = BashOperator(task_id="download_pbf", bash_command="date", dag=dag)

    task_keep_possible_ety = BashOperator(task_id="keep_elements_with_possible_etymology", bash_command="date", dag=dag)
    task_download_pbf >> task_keep_possible_ety

    task_keep_name = BashOperator(task_id="keep_elements_with_name", bash_command="date", dag=dag)
    task_keep_possible_ety >> task_keep_name

    task_remove_non_inte = BashOperator(task_id="remove_non_interesting_elements", bash_command="date", dag=dag)
    task_keep_name >> task_remove_non_inte

    pg_file_path = get_absolute_path(basename+".pg", 'pbf')
    task_export_pbf_to_pg = BashOperator(
        task_id="export_pbf_to_pg",
        bash_command='if [[ -z "$pgFilePath" ]] ; then echo \'2346\t0101000020E61000002F151BF33A7622409E0EBFF627CA4640\tnode\t506265955\t{"name":"Scuola Primaria Ada Negri","name:etymology:wikidata":"Q346250","name:language":"it"}\'; fi',
        env={ "pgFilePath": pg_file_path },
        dag=dag,
    )
    task_remove_non_inte >> task_export_pbf_to_pg

    task_setup_db_ext = PostgresOperator(
        task_id = "setup_db_extensions",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/setup-db-extensions.sql",
        dag = dag,
    )

    task_teardown_schema = PostgresOperator(
        task_id = "teardown_schema",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/teardown-schema.sql",
        dag = dag,
    )
    task_setup_db_ext >> task_teardown_schema

    task_setup_schema = PostgresOperator(
        task_id = "setup_schema",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/setup-schema.sql",
        dag = dag,
    )
    task_teardown_schema >> task_setup_schema

    task_load_ele = postgres_copy_from_file("load_elements", pg_file_path, '\t', 'osmdata', ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"], local_db_conn_id, dag)
    [task_export_pbf_to_pg, task_setup_schema] >> task_load_ele

    task_remove_ele_too_big = PostgresOperator(
        task_id = "remove_elements_too_big",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/remove-elements-too-big.sql",
        dag = dag,
    )
    task_load_ele >> task_remove_ele_too_big

    task_convert_ele_wd_cods = PostgresOperator(
        task_id = "convert_element_wikidata_cods",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-element-wikidata-cods.sql",
        dag = dag,
    )
    task_remove_ele_too_big >> task_convert_ele_wd_cods

    wikidata_init_file_path = get_absolute_path('wikidata_init.csv')
    task_load_wd_ent = postgres_copy_from_file("load_wikidata_entities", wikidata_init_file_path, ',', 'wikidata', ["wd_wikidata_cod","wd_notes","wd_gender_descr","wd_gender_color","wd_type_descr","wd_type_color"], local_db_conn_id, dag)
    task_setup_schema >> task_load_wd_ent

    task_convert_wd_ent = PostgresOperator(
        task_id = "convert_wikidata_entities",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-wikidata-entities.sql",
        dag = dag,
    )
    [task_convert_ele_wd_cods, task_load_wd_ent] >> task_convert_wd_ent

    task_load_named_after = BashOperator(task_id="download_named_after_wikidata_entities", bash_command="date", dag=dag)
    task_convert_wd_ent >> task_load_named_after
    
    task_load_consists_of = BashOperator(task_id="download_consists_of_wikidata_entities", bash_command="date", dag=dag)
    task_convert_wd_ent >> task_load_consists_of

    task_convert_ety = PostgresOperator(
        task_id = "convert_etymologies",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/convert-etymologies.sql",
        dag = dag,
    )
    [task_load_named_after, task_load_consists_of] >> task_convert_ety

    task_propagate = PostgresOperator(
        task_id = "propagate_etymologies_globally",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/propagate-etymologies-global.sql",
        dag = dag,
    )
    task_convert_ety >> task_propagate

    task_check_text_ety = PostgresOperator(
        task_id = "check_text_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/check-text-etymology.sql",
        dag = dag,
    )
    task_propagate >> task_check_text_ety

    task_check_wd_ety = PostgresOperator(
        task_id = "check_wikidata_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/check-wd-etymology.sql",
        dag = dag,
    )
    task_check_text_ety >> task_check_wd_ety

    task_move_ele = PostgresOperator(
        task_id = "move_elements_with_etymology",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/move-elements-with-etymology.sql",
        dag = dag,
    )
    task_check_wd_ety >> task_move_ele

    task_setup_ety_fk = PostgresOperator(
        task_id = "setup_etymology_foreign_key",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/etymology-foreign-key.sql",
        dag = dag,
    )
    task_move_ele >> task_setup_ety_fk

    task_drop_temp_tables = PostgresOperator(
        task_id = "drop_temporary_tables",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/drop-temp-tables.sql",
        dag = dag,
    )
    task_move_ele >> task_drop_temp_tables

    task_global_map = PostgresOperator(
        task_id = "setup_global_map",
        postgres_conn_id = local_db_conn_id,
        sql = "sql/global-map.sql",
        dag = dag,
    )
    task_move_ele >> task_global_map

    # https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior
    task_last_update = PostgresOperator(
        task_id = "save_last_data_update",
        postgres_conn_id = local_db_conn_id,
        sql = """
            CREATE OR REPLACE FUNCTION oem.last_data_update()
                RETURNS character varying
                LANGUAGE 'sql'
            AS $BODY$
            SELECT %(last_update)s;
            $BODY$;
            """,
        parameters = { "last_update": datetime.now().strftime('%y-%m-%d') },
        dag = dag,
    )
    task_setup_schema >> task_last_update

    task_pg_dump = BashOperator(task_id="pg_dump", bash_command="date", dag=dag)
    [task_setup_ety_fk, task_drop_temp_tables, task_global_map, task_last_update] >> task_pg_dump

    task_pg_restore = BashOperator(task_id="pg_restore", bash_command="date", dag=dag)
    task_pg_dump >> task_pg_restore

    return dag

planet = define_db_init_dag("db-init-planet", "@weekly", "oem-local", "oem-prod", "https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf")
nord_ovest = define_db_init_dag("db-init-nord-ovest", "@daily", "oem-local", "oem-prod-no", "http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf")
