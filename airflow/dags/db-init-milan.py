from airflow.models import \
    DAG  # ! Don't delete, necessary for Airflow to recognize this file as containing DAGs
from templates.OsmPbfDownloadDAG import OsmPbfDownloadDAG
from templates.OwmfDbInitDAG import OwmfDbInitDAG
from templates.OwmfFilterDAG import OwmfFilterDAG

download_nord_ovest_pbf = OsmPbfDownloadDAG(
    dag_id = "download-milan-latest",
    schedule = None,
    pbf_url = "https://osmit-estratti.wmcloud.org/output/pbf/comuni/015146_Milano.osm.pbf",
    prefix = "milan",
    verify_md5 = False
)

filter_nord_ovest = OwmfFilterDAG(
    dag_id = "filter-milan",
    prefix = "milan"
)

db_init_nord_ovest = OwmfDbInitDAG(
    dag_id = "db-init-milan",
    prefix = "milan",
    wikidata_country="Q38", # Italy
)
