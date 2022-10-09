from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG



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

luxembourg_dataset = OemDbInitDAG(
    dag_id="db-init-luxembourg-from-dataset",
    from_dataset=True,
    prefix="luxembourg"
)

luxembourg_pbf = OemDbInitDAG(
    dag_id="db-init-luxembourg-latest",
    from_dataset=False,
    schedule_interval=None,
    days_before_cleanup=1,
    pbf_url="http://download.geofabrik.de/europe/luxembourg-latest.osm.pbf"
)

luxembourg_html = OemDbInitDAG(
    dag_id="db-init-luxembourg-from-html",
    from_dataset=False,
    schedule_interval=None,
    days_before_cleanup=2,
    upload_db_conn_id="nord_ovest-postgres",
    html_url="http://download.geofabrik.de/europe/",
    prefix="luxembourg"
)
