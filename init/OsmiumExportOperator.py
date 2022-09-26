from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

class OsmiumExportOperator(DockerOperator):
    """
    ## Operator for `osmium export`

    Execute `osmium export` on a dedicated Docker container

    Links:
    * [osmium export documentation](https://docs.osmcode.org/osmium/latest/osmium-export.html)
    * [osmium export documentation](https://manpages.ubuntu.com/manpages/jammy/man1/osmium-export.1.html)
    * [index/cache documentation](https://docs.osmcode.org/osmium/latest/osmium-index-types.html)
    * [Docker image details](https://hub.docker.com/r/beyanora/osmtools/tags)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    """
    def __init__(self, source_path:str, dest_path:str, cache_path:str = None, config_path:str = None, **kwargs) -> None:
        cache_str = f"--index-type='sparse_file_array,{cache_path}'" if cache_path != None else ""
        config_str = f"--config='{config_path}'" if config_path != None else ""
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image='beyanora/osmtools:20210401',
            command = f"osmium export --verbose --progress --overwrite -o '{dest_path}' -f 'pg' {config_str} --add-unique-id='counter' {cache_str} --show-errors '{source_path}'",
            mounts=[
                Mount(source="open-etymology-map_db-init-work-dir", target="/workdir", type="volume"),
            ],
            mount_tmp_dir=False,
            auto_remove=True,
            pool="data_filtering",
            **kwargs
        )