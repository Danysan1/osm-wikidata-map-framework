from OemDbInitDAG import OemDbInitDAG
from airflow.models import DAG

planet_pbf = OemDbInitDAG(
    dag_id="db-init-planet-latest",
    schedule_interval=None,
    local_db_conn_id="local-oem-planet-postgres",
    pbf_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-latest.osm.pbf"
)

planet_html = OemDbInitDAG(
    dag_id="db-init-planet-from-html",
    schedule_interval="0 6 * * 0",
    days_before_cleanup=8,
    local_db_conn_id="local-oem-planet-postgres",
    upload_db_conn_id="planet-postgres",
    #html_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/",
    #html_url="https://planet.maps.mail.ru/pbf/",
    html_url="https://ftpmirror.your.org/pub/openstreetmap/pbf/",
    prefix="planet"
)

planet_rss = OemDbInitDAG(
    dag_id="db-init-planet-from-rss",
    schedule_interval=None,
    local_db_conn_id="local-oem-planet-postgres",
    rss_url="https://ftp5.gwdg.de/pub/misc/openstreetmap/planet.openstreetmap.org/pbf/planet-pbf-rss.xml"
)
