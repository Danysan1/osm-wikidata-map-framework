from airflow.models import DAG
from airflow.operators.bash import BashOperator
from pendulum import datetime

with DAG(
    dag_id="db-init-cleanup",
    schedule_interval="@daily",
    start_date=datetime(year=2022, month=9, day=15, tz="Europe/Rome"),
    catchup=False,
    tags=['oem', 'db-init'],
) as dag:
    task_ls = BashOperator(
        task_id="ls",
        bash_command="ls -lhR /workdir/",
        doc_md="""
            # List all files in the work directory
        """
    )
    
    task_cleanup = BashOperator(
        task_id="cleanup",
        bash_command="find /workdir/*/* -mtime 8 -exec rm -r {} \;",
        doc_md="""
            # Cleanup old files from work directory

            Remove files and DAG run folders older than 8 days
        """
    )
    task_ls >> task_cleanup
