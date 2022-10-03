from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG

italy_pbf = OemDbInitDAG(
    dag_id="db-init-italy-latest",
    schedule_interval=None,
    pbf_url="http://download.geofabrik.de/europe/italy-latest.osm.pbf"
)

italy_html = OemDbInitDAG(
    dag_id="db-init-italy-from-html",
    schedule_interval="0 18 * * *",
    days_before_cleanup=2,
    upload_db_conn_id="nord_ovest-postgres",
    html_url="http://download.geofabrik.de/europe/",
    html_prefix="italy"
)
