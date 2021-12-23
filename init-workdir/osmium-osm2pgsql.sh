#!/bin/bash
set -e

./osmium-postgis-base.sh "$1" "$2"

if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'planet_osm_line'
    ) AND (
        SELECT COUNT(*)!=0 FROM planet_osm_line
    )" | xargs) = 't' ]; then
    echo '========================= Data already loaded into DB ========================='
else
    echo '========================= Loading data into DB with osm2pgsql ========================='
    osm2pgsql --host="$2" --port=5432 --database=osm --user=osm --hstore --proj=4326 --create --slim --flat-nodes=/tmp/osm2pgsql-nodes.cache --cache=0 "filtered_$1"
fi

if [ -n "$3" ] || [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'wikidata_text'
    )" | xargs) = 'f' ]; then 
    echo '========================= Preparing DB schema ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-teardown.sql'
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-setup.sql'
else
    echo '========================= DB schema already prepared ========================='
fi

if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM element") -gt 0 ]; then
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'osmium-osm2pgsql-convert.sql'
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-convert.sql'
fi

./postgis-convert.sh "$1" "$2"
