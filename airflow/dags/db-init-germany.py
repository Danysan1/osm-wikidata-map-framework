from airflow.models import \
    DAG  # ! Don't delete, necessary for Airflow to recognize this file as containing DAGs
from templates.OsmPbfDownloadDAG import OsmPbfDownloadDAG
from templates.OwmfDbInitDAG import OwmfDbInitDAG
from templates.OwmfFilterDAG import OwmfFilterDAG

download_germany_pbf = OsmPbfDownloadDAG(
    dag_id="download-germany-latest",
    schedule=None,
    pbf_url="https://download.geofabrik.de/europe/germany-latest.osm.pbf",
    prefix="germany"
)

download_germany_html = OsmPbfDownloadDAG(
    dag_id="download-germany-from-html",
    schedule=None,
    html_url="https://download.geofabrik.de/europe/",
    prefix="germany"
)

filter_germany = OwmfFilterDAG(
    dag_id="filter-germany",
    prefix="germany"
)

db_init_germany = OwmfDbInitDAG(
    dag_id="db-init-germany",
    prefix="germany",
    wikidata_country="Q183" # Germany
)
