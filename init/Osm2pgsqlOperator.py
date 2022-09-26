from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount
from airflow.hooks.postgres_hook import PostgresHook

class Osm2pgsqlOperator(DockerOperator):
    """
    ## Operator for `osm2pgsql`

    Execute `osm2pgsql` on a dedicated Docker container

    Links:
    * [osm2pgsql documentation](https://osm2pgsql.org/doc/manual.html)
    * [osm2pgsql documentation](https://manpages.ubuntu.com/manpages/jammy/en/man1/osm2pgsql.1.html)
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, postgres_conn_id:str, source_path:str, **kwargs) -> None:
        postgres_conn = PostgresHook.get_connection(postgres_conn_id)
        host = postgres_conn.host
        port = postgres_conn.port
        user = postgres_conn.login
        db = postgres_conn.schema
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            command = f"osm2pgsql --host='{host}' --port='{port}' --database='{db}' --user='{user}' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '{source_path}'",
            environment = {
                "PGPASSWORD": postgres_conn.password,
            },
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            network_mode="open-etymology-map_airflow-worker-bridge", # The container needs to talk with the local DB
            mount_tmp_dir=False,
            auto_remove=True,
            pool="data_filtering",
            **kwargs
        )