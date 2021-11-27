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

echo '========================= Preparing DB schema ========================='
psql -h "$2" -d osm -U osm -f 'osmium-osm2pgsql-setup.sql'

if [ $(psql -h "$2" -U osm -d osm -t -c "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'planet_osm_line'
    )" | xargs) = 't' ]; then
    echo '========================= Data already loaded into DB ========================='
else
    echo '========================= Loading data into DB with osm2pgsql ========================='
    osm2pgsql -H "$2" -P 5432 -d osm -U osm -k -E 4326 -c "filtered_$1"
fi

if [ -f 'ids.tmp.json' ]; then
    echo '========================= Wikidata named-after data already downloaded ========================='
else
    echo '========================= Downloading Wikidata named-after data ========================='
    WIKIDATA_IDS=$(psql -h "$2" -d osm -U osm -t -f 'get_wikidata_ids.sql')
    echo "s/__ELEMENTS__/$WIKIDATA_IDS/" > ids.tmp.sed
    sed -f 'ids.tmp.sed' 'get_named_after_ids.rq' > ids.tmp.rq
    curl -X 'POST' --data-urlencode 'format=json' --data-urlencode 'query@ids.tmp.rq' -o 'ids.tmp.json' -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36" 'https://query.wikidata.org/sparql'
fi



#psql -h "$2" -d osm -U osm -f 'osmium-osm2pgsql-convert.sql'
