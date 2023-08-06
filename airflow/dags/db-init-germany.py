from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG # ! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_germany_pbf = OsmPbfDownloadDAG(
    dag_id="download-germany-latest",
    schedule=None,
    pbf_url="http://download.geofabrik.de/europe/germany-latest.osm.pbf",
    prefix="germany"
)

download_germany_html = OsmPbfDownloadDAG(
    dag_id="download-germany-from-html",
    schedule=None,
    html_url="http://download.geofabrik.de/europe/",
    prefix="germany"
)

filter_germany = OwmfFilterDAG(
    dag_id="filter-germany",
    prefix="germany"
)

db_init_germany = OwmfDbInitDAG(
    dag_id="db-init-germany",
    prefix="germany",
    upload_db_conn_id="germany-postgres"
)
