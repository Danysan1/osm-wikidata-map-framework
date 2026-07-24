from airflow.models import \
    DAG  # ! Don't delete, necessary for Airflow to recognize this file as containing DAGs
from templates.OsmPbfDownloadDAG import OsmPbfDownloadDAG
from templates.OwmfDbInitDAG import OwmfDbInitDAG
from templates.OwmfDownloadWikidataDAG import OwmfDownloadWikidataDAG
from templates.OwmfFilterDAG import OwmfFilterDAG

download_nord_ovest_pbf = OsmPbfDownloadDAG(
    dag_id = "download-lombardy-latest",
    schedule = None,
    pbf_url = "https://osmit-estratti.wmcloud.org/output/pbf/regioni/03_Lombardia.osm.pbf",
    prefix = "lombardy",
    verify_md5 = False
)

filter_nord_ovest = OwmfFilterDAG(
    dag_id = "filter-lombardy",
    prefix = "lombardy"
)

download_wikidata_lombardy = OwmfDownloadWikidataDAG(
    dag_id = "download-wikidata-lombardy",
    prefix = "lombardy",
    wikidata_country="Q38", # Italy
)

db_init_nord_ovest = OwmfDbInitDAG(
    dag_id = "db-init-lombardy",
    prefix = "lombardy",
)
