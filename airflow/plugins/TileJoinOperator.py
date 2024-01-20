from OsmDockerOperator import OsmDockerOperator

class TileJoinOperator(OsmDockerOperator):
    """
    # Merge vector tiles using Tippecanoe tile-join
    
    No official Tippecanoe Docker image exists, the used one is generated from vanilla Tippecanoe with [these instructions](https://github.com/felt/tippecanoe#docker-image)

    Links:
    * [tile-join usage example](https://github.com/felt/tippecanoe?tab=readme-ov-file#show-countries-at-low-zoom-levels-but-states-at-higher-zoom-levels)
    * [Tippecanoe repo](https://github.com/felt/tippecanoe)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.8.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator)
    """

    def __init__(self, input_files: list, output_file: str = None, extra_params: str = None, layer_name: str = None, **kwargs) -> None:
        layer = "" if layer_name is None else f"--layer={layer_name}"
        input_string = ' '.join(map(lambda file: f"'{file}'", input_files))
        super().__init__(
            container_name = f"osm-wikidata_map_framework-tile-join",
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/tippecanoe:2.35.0",
            command = f"tile-join {extra_params} {layer} -o '{output_file}' {input_string}",
            **kwargs
        )
