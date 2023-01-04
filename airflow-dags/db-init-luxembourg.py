from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OemFilterDAG import OemFilterDAG
from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_luxembourg_pbf = OsmPbfDownloadDAG(
    dag_id = "download-luxembourg-latest",
    schedule_interval=None,
    pbf_url = "http://download.geofabrik.de/europe/luxembourg-latest.osm.pbf",
    prefix = "luxembourg"
)

download_luxembourg_html = OsmPbfDownloadDAG(
    dag_id = "download-luxembourg-from-html",
    schedule_interval=None,
    html_url="http://download.geofabrik.de/europe/",
    prefix="luxembourg"
)

filter_luxembourg = OemFilterDAG(
    dag_id="filter-luxembourg",
    prefix="luxembourg"
)

db_init_luxembourg = OemDbInitDAG(
    dag_id="db-init-luxembourg",
    prefix="luxembourg"
)
