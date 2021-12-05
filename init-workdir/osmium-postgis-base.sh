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
fi

# https://docs.docker.com/compose/startup-order/
CONNECTION_TRIES=0
until psql -h "$2" -U osm -d osm -c 'SELECT version()'; do
    >&2 echo "Postgres is unavailable - sleeping"
    ((CONNECTION_TRIES+=1))
    if [ $CONNECTION_TRIES -gt 60 ]; then
        echo "ERROR: max connection tries reached, could not connect to PostgreSQL database on '$2'"
        exit 70
    fi
    sleep 1
done

echo '========================= Checking PostGIS ========================='
psql -h "$2" -U osm -d osm -f 'setup-postgis.sql'

if ! psql -h "$2" -U osm -d osm -c 'SELECT PostGIS_Version()' ; then
    echo 'ERROR: PostGIS is required, it is not installed on the DB and initialization failed'
    exit 80
fi
