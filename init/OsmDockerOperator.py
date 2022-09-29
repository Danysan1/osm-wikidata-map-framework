from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

class OsmDockerOperator(DockerOperator):
    """
    ## Operator for osmium or osm2pgsql

    Execute osmium or osm2pgsql on a dedicated Docker container

    Links:
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/2.4.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/2.4.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            pool="data_filtering",
            **kwargs
        )