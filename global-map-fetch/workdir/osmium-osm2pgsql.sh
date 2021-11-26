#!/bin/bash
set -e

./osmium.sh "$1" "$2"

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

echo '========================= Loading data into DB with osm2pgsql ========================='
osm2pgsql -H "$2" -P 5432 -d osm -U osm -c "filtered_$1"
