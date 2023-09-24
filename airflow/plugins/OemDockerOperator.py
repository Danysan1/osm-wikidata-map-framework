from airflow.providers.docker.operators.docker import DockerOperator
from os import environ

class OemDockerOperator(DockerOperator):
    """
    ## Operator for PHP scripts

    Execute PHP scripts on a dedicated Docker container using this project's production Docker image

    Links:
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, postgres_conn_id:str, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework",
            environment = {
                "owmf_db_enable": True,
                "owmf_db_host": f'{{{{ conn["{postgres_conn_id}"].host }}}}',
                "owmf_db_port": f'{{{{ (conn["{postgres_conn_id}"].port)|string }}}}',
                "owmf_db_user": f'{{{{ conn["{postgres_conn_id}"].login }}}}',
                "owmf_db_database": f'{{{{ conn["{postgres_conn_id}"].schema }}}}',
                "owmf_db_password": f'{{{{ conn["{postgres_conn_id}"].password }}}}',
                "owmf_wikidata_endpoint": 'https://{{ conn.wikidata_api.host }}',
                "owmf_osm_wikidata_keys": '{{ var.value.osm_wikidata_keys }}',
                "owmf_osm_wikidata_properties": '{{ var.value.osm_wikidata_properties }}',
            },
            retries = 3,
            network_mode = environ.get("AIRFLOW_VAR_POSTGIS_BRIDGE"), # The container needs to talk with the local DB
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            **kwargs
        )