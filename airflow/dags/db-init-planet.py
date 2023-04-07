from OsmPbfDownloadDAG import OsmPbfDownloadDAG
from OemFilterDAG import OemFilterDAG
from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG #! Don't delete, necessary for Airflow to recognize this file as containing DAGs

download_planet_pbf = OsmPbfDownloadDAG(
    dag_id="download-planet-latest",
    schedule=None,
    days_before_cleanup=8,
    pbf_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf",
    prefix="planet"
)

download_planet_html = OsmPbfDownloadDAG(
    dag_id="download-planet-from-html",
    schedule=None,
    days_before_cleanup=8,
    html_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/",
    #html_url="https://planet.maps.mail.ru/pbf/",
    #html_url="https://ftpmirror.your.org/pub/openstreetmap/pbf/",
    prefix="planet"
)

download_planet_rss = OsmPbfDownloadDAG(
    dag_id="download-planet-from-rss",
    schedule="0 6 * * 0",
    days_before_cleanup=8,
    #rss_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-pbf-rss.xml",
    rss_url = "https://planet.openstreetmap.org/pbf/planet-pbf-rss.xml",
    prefix="planet"
)

filter_planet = OemFilterDAG(
    dag_id="filter-planet",
    days_before_cleanup=8,
    prefix="planet"
)

db_init_planet = OemDbInitDAG(
    dag_id="db-init-planet",
    days_before_cleanup=8,
    prefix="planet",
    local_db_conn_id="local_oem_postgres_planet",
    upload_db_conn_id="planet-postgres",
)
