from OsmDockerOperator import OsmDockerOperator

class TippecanoeOperator(OsmDockerOperator):
    """
    # Generate a pmtiles file from a geojson file using Tippecanoe.
    
    No official Tippecanoe Docker image exists, the used one is generated from vanilla Tippecanoe with [these instructions](https://github.com/felt/tippecanoe#docker-image)

    Links:
    * [Tippecanoe repo](https://github.com/felt/tippecanoe)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.8.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator)
    """

    def __init__(self, input_file: str, output_file: str, min_zoom: int, extra_params: str, **kwargs) -> None:
        super().__init__(
            container_name = "osm-wikidata_map_framework-generate_pmtiles",
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/tippecanoe:2.35.0",
            command = f"tippecanoe --output='{output_file}' '{input_file}' -Z {min_zoom} {extra_params}",
            **kwargs
        )
