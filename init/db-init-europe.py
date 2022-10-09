from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG

europe_pbf = OemDbInitDAG(
    dag_id="db-init-europe-latest",
    from_dataset=False,
    schedule_interval=None,
    days_before_cleanup=1,
    pbf_url="http://download.geofabrik.de/europe-latest.osm.pbf"
)
