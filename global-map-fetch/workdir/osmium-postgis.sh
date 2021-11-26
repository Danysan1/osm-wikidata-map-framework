#!/bin/bash
set -e

./osmium.sh "$1" "$2" 'pg'

if [ -z "$2" ]; then
    echo 'You must pass as second argument the PostGIS DB host'
    exit 50
fi

echo '========================= Checking PostGIS version ========================='

if ! command -v psql > /dev/null; then
    echo 'psql is not installed'
    exit 60
elif ! psql -h "$2" -U osm -d osm -c 'SELECT PostGIS_Version()' > /dev/null ; then
    echo 'PostGIS is required, it is not installed on the DB'
    exit 70
fi

echo '========================= Preparing DB schema ========================='
psql -h "$2" -U osm -d osm -f 'osmium-postgis-setup.sql'

echo '========================= Loading data into DB ========================='
psql -h "$2" -U osm -d osm -c "\copy osmdata FROM 'filtered_$1.pg'"

echo '========================= Converting data ========================='
psql -h "$2" -U osm -d osm -f 'osmium-postgis-convert.sql'
