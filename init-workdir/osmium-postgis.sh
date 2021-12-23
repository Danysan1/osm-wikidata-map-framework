#!/bin/bash
set -e

./osmium-postgis-base.sh "$1" "$2" 'pg'

if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'osmdata'
    )" | xargs) = 'f' ]; then 
    echo '========================= Preparing DB schema ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-teardown.sql'
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-setup.sql'
    psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -f 'osmium-postgis-setup.sql'
else
    echo '========================= DB schema already prepared ========================='
fi

if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM osmdata") = 0 ]; then
    echo '========================= Loading data into DB ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -c "\copy osmdata FROM 'filtered_$1.pg'"
else
    echo '========================= Data already loaded into DB ========================='
fi

if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM element") = 0 ]; then
    echo '========================= Converting data ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -f 'osmium-postgis-convert.sql'
else
    echo '========================= Data already converted ========================='
fi

./postgis-convert.sh "$1" "$2"
