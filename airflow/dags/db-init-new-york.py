from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_new_york_pbf = OsmPbfDownloadDAG(
    dag_id = "download-new-york-latest",
    schedule=None,
    pbf_url = "https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf",
    prefix = "new-york"
)

download_new_york_html = OsmPbfDownloadDAG(
    dag_id = "download-new-york-from-html",
    schedule="0 18 * * *",
    html_url="https://download.geofabrik.de/north-america/us/",
    prefix="new-york"
)

filter_new_york = OwmfFilterDAG(
    dag_id="filter-new-york",
    prefix="new-york"
)

db_init_new_york = OwmfDbInitDAG(
    dag_id="db-init-new-york",
    prefix="new-york",
    wikidata_country="Q30", # USA
)
