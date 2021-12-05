#!/bin/bash
set -e

./osmium.sh "$1" "$2" "$3"

if [ -z "$2" ]; then
    echo 'ERROR: You must pass as second argument the PostGIS DB host'
    exit 50
fi

echo '========================= Checking DB ========================='

if ! command -v psql > /dev/null; then
    echo 'ERROR: psql is not installed'
    exit 60
elif ! psql -h "$2" -U osm -d osm -c 'SELECT version()' > /dev/null ; then
    echo "ERROR: could not connect to PostgreSQL database on '$2'"
    exit 70
#elif ! psql -h "$2" -U osm -d osm -c 'SELECT PostGIS_Version()' > /dev/null ; then
#    echo 'ERROR: PostGIS is required, it is not installed on the DB'
#    exit 80
fi

psql -h "$2" -U osm -d osm -f 'setup-postgis.sql'
