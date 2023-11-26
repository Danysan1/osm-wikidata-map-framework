from airflow.providers.docker.operators.docker import DockerOperator
from os import environ

class LoadRelatedDockerOperator(DockerOperator):
    """
    ## Operator for PHP scripts

    Execute PHP scripts on a dedicated Docker container using this project's dedicated Docker image

    Links:
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, postgres_conn_id:str, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/load-related",
            environment = {
                "owmf_db_uri": f'{{{{ conn["{postgres_conn_id}"].get_uri() }}}}',
                "owmf_osm_wikidata_keys": '{{ var.value.osm_wikidata_keys }}',
                "owmf_osm_wikidata_properties": '{{ var.value.osm_wikidata_properties }}',
            },
            retries = 3,
            network_mode = environ.get("AIRFLOW_VAR_POSTGIS_BRIDGE"), # The container needs to talk with the local DB
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            **kwargs
        )