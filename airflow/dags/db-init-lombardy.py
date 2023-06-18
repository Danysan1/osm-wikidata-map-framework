from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OwmfFilterDAG import OwmfFilterDAG
from OwmfDbInitDAG import OwmfDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_nord_ovest_pbf = OsmPbfDownloadDAG(
    dag_id = "download-lombardy-latest",
    schedule = None,
    pbf_url = "https://osmit-estratti.wmcloud.org/dati/poly/regioni/pbf/03_Lombardia.osm.pbf",
    prefix = "lombardy",
    verify_md5 = False
)

filter_nord_ovest = OwmfFilterDAG(
    dag_id = "filter-lombardy",
    prefix = "lombardy"
)

db_init_nord_ovest = OwmfDbInitDAG(
    dag_id = "db-init-lombardy",
    prefix = "lombardy"
)
