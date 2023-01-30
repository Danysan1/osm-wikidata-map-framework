from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

class OemDockerOperator(DockerOperator):
    """
    ## Operator for open-etymology-map PHP scripts

    Execute open-etymology-map PHP scripts on a dedicated Docker container

    Links:
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, postgres_conn_id:str, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image = "registry.gitlab.com/openetymologymap/open-etymology-map:latest",
            environment = {
                "db_enable": True,
                "db_host": f'{{{{ conn["{postgres_conn_id}"].host }}}}',
                "db_port": f'{{{{ (conn["{postgres_conn_id}"].port)|string }}}}',
                "db_user": f'{{{{ conn["{postgres_conn_id}"].login }}}}',
                "db_database": f'{{{{ conn["{postgres_conn_id}"].schema }}}}',
                "db_password": f'{{{{ conn["{postgres_conn_id}"].password }}}}',
                "wikidata_endpoint": "https://query.wikidata.org/sparql",
            },
            retries = 3,
            network_mode="open-etymology-map_airflow-postgis-bridge", # The container needs to talk with the local DB
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            **kwargs
        )