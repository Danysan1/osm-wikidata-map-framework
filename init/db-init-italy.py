from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG



download_italy_pbf = OsmPbfDownloadDAG(
    dag_id = "download-italy-latest",
    schedule_interval=None,
    pbf_url = "http://download.geofabrik.de/europe/italy-latest.osm.pbf",
    prefix = "italy"
)

download_italy_html = OsmPbfDownloadDAG(
    dag_id = "download-italy-from-html",
    schedule_interval="0 18 * * *",
    html_url="http://download.geofabrik.de/europe/",
    prefix="italy"
)

italy_dataset = OemDbInitDAG(
    dag_id="db-init-italy-from-dataset",
    from_dataset=True,
    prefix="italy"
)

italy_pbf = OemDbInitDAG(
    dag_id="db-init-italy-latest",
    from_dataset=False,
    schedule_interval=None,
    days_before_cleanup=1,
    pbf_url="http://download.geofabrik.de/europe/italy-latest.osm.pbf"
)

italy_html = OemDbInitDAG(
    dag_id="db-init-italy-from-html",
    from_dataset=False,
    schedule_interval="0 18 * * *",
    days_before_cleanup=2,
    upload_db_conn_id="nord_ovest-postgres",
    html_url="http://download.geofabrik.de/europe/",
    prefix="italy"
)
