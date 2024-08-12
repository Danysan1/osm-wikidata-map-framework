from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_italy_pbf = OsmPbfDownloadDAG(
    dag_id = "download-italy-latest",
    schedule=None,
    pbf_url = "https://download.geofabrik.de/europe/italy-latest.osm.pbf",
    prefix = "italy"
)

download_italy_html = OsmPbfDownloadDAG(
    dag_id = "download-italy-from-html",
    schedule="0 18 * * *",
    html_url="https://download.geofabrik.de/europe/",
    prefix="italy"
)

filter_italy = OwmfFilterDAG(
    dag_id="filter-italy",
    prefix="italy"
)

db_init_italy = OwmfDbInitDAG(
    dag_id="db-init-italy",
    prefix="italy",
    wikidata_country="Q38", # Italy
)
