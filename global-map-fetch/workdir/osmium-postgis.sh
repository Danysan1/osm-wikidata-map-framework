#!/bin/bash
set -e

./osmium-postgis-base.sh "$1" "$2" 'pg'

echo '========================= Preparing DB schema ========================='
psql -h "$2" -d osm -U osm -f 'postgis-schema-setup.sql'
psql -h "$2" -U osm -d osm -f 'osmium-postgis-setup.sql'

echo '========================= Loading data into DB ========================='
psql -h "$2" -U osm -d osm -c "\copy osmdata FROM 'filtered_$1.pg'"

