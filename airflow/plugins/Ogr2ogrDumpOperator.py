from OsmDockerOperator import OsmDockerOperator
from airflow.hooks.postgres_hook import PostgresHook
from os import environ

class Ogr2ogrDumpOperator(OsmDockerOperator):
    """
    # Dump the output of a query from a PostGIS DB to a file
    
    Links:
    * [gdal image](https://github.com/OSGeo/gdal/tree/master/docker)
    * [Container registry](https://github.com/OSGeo/gdal/pkgs/container/gdal)
    * [Inspiration from stack overflow](https://gis.stackexchange.com/a/91058/196469)
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.8.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator)
    * [PMTiles driver (GDAL > v3.8 only)](https://gdal.org/drivers/vector/pmtiles.html)
    * [GeoJSON driver](https://gdal.org/drivers/vector/geojson.html)
    """

    def __init__(self, postgres_conn_id:str, query:str, dest_path:str, dest_format:str, **kwargs) -> None:
        command = f'ogr2ogr -f {dest_format} "{dest_path}" -sql "{query}" "PG:$DB_URI?application_name=gdal"'
        super().__init__(
            image = "ghcr.io/osgeo/gdal:alpine-small-3.10.2",
            command = f"sh -c '{command}'",
            environment = {
                "DB_URI": f'{{{{ conn.get("{postgres_conn_id}").get_uri() }}}}',
                "PGPASSWORD": f'{{{{ conn.get("{postgres_conn_id}").password }}}}',
            },
            network_mode = environ.get("AIRFLOW_VAR_POSTGIS_BRIDGE"), # The container needs to talk with the local DB
            **kwargs
        )