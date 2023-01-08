from OsmDockerOperator import OsmDockerOperator
from airflow.hooks.postgres_hook import PostgresHook

class Osm2pgsqlOperator(OsmDockerOperator):
    """
    ## Operator for `osm2pgsql`

    Execute `osm2pgsql` on a dedicated Docker container

    Links:
    * [osm2pgsql documentation](https://osm2pgsql.org/doc/manual.html)
    * [osm2pgsql documentation](https://manpages.ubuntu.com/manpages/jammy/en/man1/osm2pgsql.1.html)
    * [beyanora/osmtools Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    """
    def __init__(self, postgres_conn_id:str, source_path:str, **kwargs) -> None:
        postgres_conn = PostgresHook.get_connection(postgres_conn_id)
        host = postgres_conn.host
        port = postgres_conn.port
        user = postgres_conn.login
        db = postgres_conn.schema
        super().__init__(
            image = 'beyanora/osmtools:20210401',
            command = f"osm2pgsql --host='{host}' --port='{port}' --database='{db}' --user='{user}' --hstore-all --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 '{source_path}'",
            environment = {
                "PGPASSWORD": postgres_conn.password,
            },
            network_mode="open-etymology-map_airflow-postgis-bridge", # The container needs to talk with the local DB
            **kwargs
        )