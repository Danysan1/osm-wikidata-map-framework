from airflow.models import DAG
from airflow.operators.bash import BashOperator
from pendulum import datetime

with DAG(
    # https://airflow.apache.org/docs/apache-airflow/2.4.0/timezone.html
    # https://pendulum.eustace.io/docs/#instantiation
    start_date=datetime(year=2022, month=9, day=15, tz='local'),
    dag_id="db-init-cleanup",
    schedule_interval="@daily",
    catchup=False,
    tags=['oem', 'db-init'],
    params={ "min_days_file_age": 7 },
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
        bash_command="find /workdir/ -type f -mtime +${minDaysFileAge} -exec rm {} \;",
        env={
            "minDaysFileAge": "{{ params.min_days_file_age }}",
        },
        doc_md="""
            # Cleanup old files from work directory

            Remove files and DAG run folders older than 8 days
        """
    )
    task_ls >> task_cleanup
