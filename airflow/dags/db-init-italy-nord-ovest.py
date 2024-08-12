from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_nord_ovest_pbf = OsmPbfDownloadDAG(
    dag_id = "download-italy-nord-ovest-latest",
    schedule=None,
    pbf_url = "https://download.geofabrik.de/europe/italy/nord-ovest-latest.osm.pbf",
    prefix = "nord-ovest"
)

download_nord_ovest_html = OsmPbfDownloadDAG(
    dag_id = "download-italy-nord-ovest-from-html",
    schedule=None,
    html_url="https://download.geofabrik.de/europe/italy/",
    prefix="nord-ovest"
)

filter_nord_ovest = OwmfFilterDAG(
    dag_id="filter-italy-nord-ovest",
    prefix="nord-ovest"
)

db_init_nord_ovest = OwmfDbInitDAG(
    dag_id="db-init-italy-nord-ovest",
    prefix="nord-ovest",
    wikidata_country="Q38", # Italy
)
