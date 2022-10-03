from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG

nord_ovest_pbf = OemDbInitDAG(
    dag_id="db-init-italy-nord-ovest-latest",
    schedule_interval=None,
    pbf_url="http://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf"
)

nord_ovest_html = OemDbInitDAG(
    dag_id="db-init-italy-nord-ovest-from-html",
    schedule_interval=None,
    html_url="http://download.geofabrik.de/europe/italy/",
    html_prefix="nord-ovest"
)
