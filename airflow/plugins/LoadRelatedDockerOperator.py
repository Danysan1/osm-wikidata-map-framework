from airflow.providers.docker.operators.docker import DockerOperator
from os import environ

class LoadRelatedDockerOperator(DockerOperator):
    """
    # Load linked entity relationships from Wikidata

    * load into the `osmdata` table of the local PostGIS DB all the Wikidata entities with a location and the configured [in]direct properties which do not already exist
    * load into the `wikidata` table of the local PostGIS DB all the Wikidata entities that the entity is named after
    * load into the `etymology` table of the local PostGIS DB the [in]direct related relationships

    Uses the Wikidata SPARQL query service through the `load-related` JS script on a dedicated Docker container using this project's dedicated Docker image

    Links:
    * [DockerOperator documentation](https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html?highlight=dockeroperator#airflow.providers.docker.operators.docker.DockerOperator)
    * [load-related folder](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/front-end/src/load-related?ref_type=heads)
    * [WikidataBulkService folder](https://gitlab.com/openetymologymap/osm-wikidata-map-framework/-/tree/main/front-end/src/services/WikidataBulkService?ref_type=heads)
    """
    def __init__(self, postgres_conn_id:str, wikidata_country:str=None, **kwargs) -> None:
        super().__init__(
            docker_url='unix://var/run/docker.sock',
            image = "registry.gitlab.com/openetymologymap/osm-wikidata-map-framework/load-related",
            environment = {
                "owmf_db_uri": f'{{{{ conn["{postgres_conn_id}"].get_uri() }}}}',
                "owmf_osm_wikidata_keys": '{{ var.value.osm_wikidata_keys }}',
                "owmf_osm_wikidata_properties": '{{ var.value.osm_wikidata_properties }}',
                "owmf_wikidata_country": wikidata_country,
            },
            retries = 3,
            network_mode = environ.get("AIRFLOW_VAR_POSTGIS_BRIDGE"), # The container needs to talk with the local DB
            mount_tmp_dir=False, # https://airflow.apache.org/docs/apache-airflow-providers-docker/3.5.0/_api/airflow/providers/docker/operators/docker/index.html#airflow.providers.docker.operators.docker.DockerOperator
            auto_remove=True,
            **kwargs
        )