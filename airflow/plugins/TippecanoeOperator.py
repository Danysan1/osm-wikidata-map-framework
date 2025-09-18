from OsmDockerOperator import OsmDockerOperator

class TippecanoeOperator(OsmDockerOperator):
    """
    # Generate a pmtiles file from a geojson file using Tippecanoe.
    
    No official Tippecanoe Docker image exists, the used one is generated from vanilla Tippecanoe with [these instructions](https://github.com/felt/tippecanoe#docker-image)

    Links:
    * [Tippecanoe repo](https://github.com/felt/tippecanoe)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.8.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator)
    """

    def __init__(self, input_file: str, min_zoom: int, max_zoom: int = None, extra_params: str = None, layer_name: str = None, output_file: str = None, output_dir: str = None, **kwargs) -> None:
        output = f"--output-to-directory='{output_dir}'" if output_file is None else f"--output='{output_file}'"
        layer = "" if layer_name is None else f"--layer={layer_name}"
        
        if max_zoom is None:
            max_zoom_arg = "-zg"
        elif max_zoom > min_zoom:
            max_zoom_arg = f"-z{max_zoom}"
        else:
            print(f"Invalid max_zoom={max_zoom} <= min_zoom={min_zoom}, using max_zoom={min_zoom+1}")
            max_zoom_arg = f"-z{min_zoom + 1}"
        
        super().__init__(
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/tippecanoe:2.75.1",
            command = f"tippecanoe '{input_file}' {output} {layer} -Z{min_zoom} {max_zoom_arg} {extra_params}",
            **kwargs
        )
