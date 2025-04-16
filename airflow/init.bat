docker compose run --rm airflow-worker db migrate
docker compose run --rm airflow-init
REM docker compose run --rm airflow-worker users  create --role Admin --username admin --email admin --firstname admin --lastname admin