import os
from datetime import datetime
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator

def get_absolute_path(filename:str, folder:str) -> str:
    my_dir_path = os.path.dirname(os.path.abspath(__file__))
    file_dir_path = os.path.join(my_dir_path, folder)
    return os.path.join(file_dir_path, filename)

def read_sql_query(filename:str) -> str:
    """
    See https://airflow.apache.org/docs/apache-airflow/2.1.4/best-practices.html#dynamic-dags-with-external-configuration-from-a-structured-data-file
    """
    sql_file_path = get_absolute_path(filename, 'sql')
    with open(sql_file_path) as sql_file:
        sql_content = sql_file.read()

    return sql_content


def postgres_operator_from_file(task_id:str, filename:str, params:dict = None) -> PostgresOperator:
    return PostgresOperator(
        task_id = task_id,
        postgres_conn_id = "oem-local",
        sql = read_sql_query(filename),
        params = params
    )

def do_postgres_query(conn_id:str, sql_stmt:str, params:dict = None):
    """
    See https://medium.com/towards-data-science/apache-airflow-for-data-science-how-to-work-with-databases-postgres-a4dc79c04cb8
    """
    pg_hook = PostgresHook(conn_id)
    pg_conn = pg_hook.get_conn()
    cursor = pg_conn.cursor()
    cursor.execute(sql_stmt, params)
    return cursor.fetchall()


def postgres_query_from_file(task_id:str, filename:str, params:dict = None) -> PythonOperator:
    return PythonOperator(
        task_id = task_id,
        python_callable = do_postgres_query,
        params = {
            "conn_id" : "oem-local",
            "sql_stmt" : read_sql_query(filename),
            "params" : params
        }
    )

def do_postgres_copy(conn_id:str, filepath:str, format:str, table:str, columns:list[str]):
    """
    See https://www.psycopg.org/docs/usage.html#copy
    See https://www.psycopg.org/docs/cursor.html#cursor.copy_from
    """
    pg_hook = PostgresHook(conn_id)
    pg_conn = pg_hook.get_conn()
    cursor = pg_conn.cursor()
    cursor.copy_from(filepath, table, '\\t', '\\\\N', 8192, columns)
    return cursor.fetchall()

def postgres_copy_from_file(task_id:str, filename:str, format:str, table:str, columns:list[str]) -> PythonOperator:
    pg_file_path = get_absolute_path(filename, 'pbf')
    return PythonOperator(
        task_id = task_id,
        python_callable = do_postgres_copy,
        params = {
            "conn_id" : "oem-local",
            "filepath" : pg_file_path,
            "format" : format,
            "columns": columns,
        }
    )

def define_db_init_dag(dag_id:str, schedule_interval:str, upload_db_conn_id:str, source_url:str):
    if not source_url.enswith(".osm.pbf"):
        raise Exception("The source url must be an OSM pbf file")

    # https://linuxhint.com/fetch-basename-python/
    basename = os.path.basename(source_url)
    
    default_args = {
        "source_url" : source_url,
        "upload_db_conn_id" : upload_db_conn_id,
    }

    with DAG(
        dag_id = dag_id,
        schedule_interval = schedule_interval,
        start_date=datetime(year=2022, month=2, day=1),
        catchup=False,
        tags=['oem', 'db-init'],
        params=default_args,
    ) as dag:
        """
        See https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html
        """

        task_teardown_schema = postgres_operator_from_file("teardown_schema", "teardown-schema.sql")

        task_setup_schema = postgres_operator_from_file("setup_schema", "setup-schema.sql")
        task_teardown_schema >> task_setup_schema

        task_load_ele = postgres_copy_from_file("load_elements", basename+".pg", 'oem.osmdata', ["osm_id","osm_geometry","osm_osm_type","osm_osm_id","osm_tags"])
        task_setup_schema >> task_load_ele

        task_remove_ele_too_big = postgres_operator_from_file("remove_elements_too_big", "remove-elements-too-big.sql")
        task_load_ele >> task_remove_ele_too_big

        task_convert_ele_wd_cods = postgres_operator_from_file("convert_element_wikidata_cods", "convert-element-wikidata-cods.sql")
        task_remove_ele_too_big >> task_convert_ele_wd_cods

        task_convert_wd_entities = postgres_operator_from_file("convert_wikidata_entities", "convert-wikidata-entities.sql")
        task_convert_ele_wd_cods >> task_convert_wd_entities

define_db_init_dag("db-init-planet", "@weekly", "oem-prod", "https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf")
define_db_init_dag("db-init-nord-ovest", "@daily", "oem-prod-no", "http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf")
