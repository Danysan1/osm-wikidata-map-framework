from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount
from os import getuid

class OsmDockerOperator(DockerOperator):
    """
    ## Operator for osmium or osm2pgsql

    Execute osmium or osm2pgsql on a dedicated Docker container

    Links:
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/2.4.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            mounts=[
                Mount( # https://docker-py.readthedocs.io/en/stable/api.html#docker.types.Mount
                    source = "open-etymology-map_db-init-work-dir", # docker-compose "db-init-work-dir" volume
                    target = "/workdir",
                    type = "volume",
                    consistency = "delegated" # Improves performance, see https://docker-docs.netlify.app/docker-for-mac/osxfs-caching/#tuning-with-consistent-cached-and-delegated-configurations
                ),
            ],
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/2.4.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            pool="data_filtering",
            user=getuid(),
            **kwargs
        )