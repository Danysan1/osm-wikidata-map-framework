from airflow.sdk import \
    DAG  # ! Don't delete, necessary for Airflow to recognize this file as containing DAGs
from templates.OsmPbfDownloadDAG import OsmPbfDownloadDAG
from templates.OwmfDbInitDAG import OwmfDbInitDAG
from templates.OwmfFilterDAG import OwmfFilterDAG

download_europe_pbf = OsmPbfDownloadDAG(
    dag_id="download-europe-latest",
    schedule=None,
    pbf_url="https://download.geofabrik.de/europe-latest.osm.pbf",
    prefix="europe"
)

filter_europe = OwmfFilterDAG(
    dag_id="filter-europe",
    prefix="europe"
)

db_init_europe = OwmfDbInitDAG(
    dag_id="db-init-europe",
    prefix="europe"
)
