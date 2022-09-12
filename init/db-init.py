import os
from datetime import datetime
from airflow.models import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.hooks.postgres_hook import PostgresHook
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator

def read_sql_query(filename:str) -> str:
    """
    See https://airflow.apache.org/docs/apache-airflow/2.1.4/best-practices.html#dynamic-dags-with-external-configuration-from-a-structured-data-file
    """
    my_dir_path = os.path.dirname(os.path.abspath(__file__))
    sql_dir_path = os.path.join(my_dir_path, "sql")
    sql_file_path = os.path.join(sql_dir_path, filename)

    with open(sql_file_path) as sql_file:
        sql_content = sql_file.readlines()

    return sql_content


def postgres_opearator_from_file(task_id:str, filename:str, params:dict = None) -> PostgresOperator:
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
            "postgres_conn_id" : "oem-local",
            "sql_stmt" : read_sql_query(filename),
            "params" : params
        }
    )

default_args = {
    "source_url" : "http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf",
    "local_db_conn_id" : "oem-local",
    "upload_db_conn_id" : "oem-prod-no",
}

with DAG(
    dag_id='db-init',
    schedule_interval='@daily',
    start_date=datetime(year=2022, month=2, day=1),
    catchup=False,
    tags=['oem', 'db-init'],
    params=default_args,
) as dag:
    """
    See https://airflow.apache.org/docs/apache-airflow/stable/concepts/params.html
    """

    task_teardown_schema = postgres_opearator_from_file("teardown_schema", "teardown-schema.sql")

    task_setup_schema = postgres_opearator_from_file("setup_schema", "setup-schema.sql")
    task_teardown_schema >> task_setup_schema

    task_remove_ele_too_big = postgres_opearator_from_file("remove_elements_too_big", "remove-elements-too-big.sql")
    task_setup_schema >> task_remove_ele_too_big

    task_convert_ele_wd_cods = postgres_opearator_from_file("convert_element_wd_cods", "convert-element-wikidata-cods.sql")
    task_remove_ele_too_big >> task_convert_ele_wd_cods
