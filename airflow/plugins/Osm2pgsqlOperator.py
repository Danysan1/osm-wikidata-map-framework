from OsmDockerOperator import OsmDockerOperator
from airflow.hooks.postgres_hook import PostgresHook
from os import environ

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
        cache_options = "--flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0"
        command = f'osm2pgsql --database="$DB_URI" --hstore-all --proj=4326 --create --slim {cache_options} "{source_path}"'
        super().__init__(
            image = 'beyanora/osmtools:20210401', # TODO: try https://hub.docker.com/r/iboates/osm2pgsql
            command = f"bash -c '{command}'",
            environment = {
                "DB_URI": f'{{{{ conn.get("{postgres_conn_id}").get_uri() }}}}',
                "PGPASSWORD": f'{{{{ conn.get("{postgres_conn_id}").password }}}}',
            },
            network_mode = environ.get("AIRFLOW_VAR_POSTGIS_BRIDGE"), # The container needs to talk with the local DB
            **kwargs
        )