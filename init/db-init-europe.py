from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG

europe_pbf = OemDbInitDAG(
    dag_id="db-init-europe-latest",
    schedule_interval=None,
    pbf_url="http://download.geofabrik.de/europe-latest.osm.pbf"
)
