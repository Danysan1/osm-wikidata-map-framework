from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_nord_ovest_pbf = OsmPbfDownloadDAG(
    dag_id = "download-milan-latest",
    schedule = None,
    pbf_url = "https://osmit-estratti.wmcloud.org/dati/poly/comuni/pbf/015146_Milano.osm.pbf",
    prefix = "milan",
    verify_md5 = False
)

filter_nord_ovest = OwmfFilterDAG(
    dag_id = "filter-milan",
    prefix = "milan"
)

db_init_nord_ovest = OwmfDbInitDAG(
    dag_id = "db-init-milan",
    prefix = "milan"
)
