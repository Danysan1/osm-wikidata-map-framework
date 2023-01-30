from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OemFilterDAG import OemFilterDAG
from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_europe_pbf = OsmPbfDownloadDAG(
    dag_id="db-init-europe-latest",
    schedule=None,
    pbf_url="http://download.geofabrik.de/europe-latest.osm.pbf",
    prefix="europe"
)

filter_europe = OemFilterDAG(
    dag_id="filter-europe",
    prefix="europe"
)

db_init_europe = OemDbInitDAG(
    dag_id="db-init-europe",
    prefix="europe"
)
