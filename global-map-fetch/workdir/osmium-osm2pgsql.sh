#!/bin/bash
set -e

./osmium.sh "$1" "$2"

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
elif ! psql -h "$2" -U osm -d osm -c 'SELECT PostGIS_Version()' > /dev/null ; then
    echo 'ERROR: PostGIS is required, it is not installed on the DB'
    exit 80
fi

if [ $(psql -h "$2" -U osm -d osm -t -c "SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'planet_osm_line'
    )" | xargs) = 't' ]; then
    echo '========================= Data already loaded into DB ========================='
else
    echo '========================= Loading data into DB with osm2pgsql ========================='
    psql -h "$2" -U osm -d osm -c 'CREATE EXTENSION IF NOT EXISTS hstore'
    osm2pgsql -H "$2" -P 5432 -d osm -U osm -k -E 4326 -c "filtered_$1"
fi

echo '========================= Preparing DB schema ========================='
psql -h "$2" -d osm -U osm -f 'osmium-osm2pgsql-setup.sql'

if [ -f 'get_wikidata_ids.tmp.json' ]; then
    echo '========================= Wikidata named-after data already downloaded ========================='
else
    echo '========================= Downloading Wikidata named-after data ========================='
    WIKIDATA_IDS=$(psql -h "$2" -d osm -U osm -t -f 'get_wikidata_ids.sql')
    echo "s/__ELEMENTS__/$WIKIDATA_IDS/g" > get_wikidata_ids.tmp.sed
    sed -f 'get_wikidata_ids.tmp.sed' 'get_named_after_ids.rq' > get_wikidata_ids.tmp.rq
    curl -X 'POST' --data-urlencode 'format=json' --data-urlencode 'query@get_wikidata_ids.tmp.rq' -o 'get_wikidata_ids.tmp.json' -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36" 'https://query.wikidata.org/sparql'
fi

if [ $(psql -h "$2" -U osm -d osm -t -c "SELECT COUNT(*) FROM wikidata_named_after" | xargs) != '0' ]; then
    echo '========================= Wikidata named-after data already loaded into DB ========================='
else
    echo '========================= Loading Wikidata named-after data into DB ========================='
    WIKIDATA_JSON=$(cat get_wikidata_ids.tmp.json | tr -d '\n' | sed "s/'/''/g")
    echo "s|__WIKIDATA_JSON__|$WIKIDATA_JSON|g" > load_wikidata_ids.tmp.sed
    sed -f 'load_wikidata_ids.tmp.sed' 'load_wikidata_ids.sql' > load_wikidata_ids.tmp.sql
    psql -h "$2" -d osm -U osm -t -f 'load_wikidata_ids.tmp.sql'
fi

if [ -f 'get_wikidata_base.tmp.json' ]; then 
    echo '========================= Wikidata base data already downloaded ========================='
else
    echo '========================= Downloading Wikidata base data ========================='
    WIKIDATA_IDS=$(psql -h "$2" -d osm -U osm -t -c "SELECT STRING_AGG('wd:'||wd_wikidata_id, ' ') FROM public.wikidata")
    echo "s/__WIKIDATA_IDS__/$WIKIDATA_IDS/g" > get_wikidata_base.tmp.sed
    sed -f 'get_wikidata_base.tmp.sed' 'get_wikidata_base.rq' > get_wikidata_base.tmp.rq
    curl -X 'POST' --data-urlencode 'format=json' --data-urlencode 'query@get_wikidata_base.tmp.rq' -o 'get_wikidata_base.tmp.json' -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36" 'https://query.wikidata.org/sparql'
fi

if [ $(psql -h "$2" -U osm -d osm -t -c "SELECT COUNT(wd_position) FROM wikidata" | xargs) != '0' ]; then
    echo '========================= Wikidata base data already loaded into DB ========================='
else
    echo '========================= Loading Wikidata base data into DB ========================='
    WIKIDATA_JSON=$(cat get_wikidata_base.tmp.json | tr -d '\n' | sed "s/'/''/g")
    echo "s|__WIKIDATA_JSON__|$WIKIDATA_JSON|g" > load_wikidata_base.tmp.sed
    sed -f 'load_wikidata_base.tmp.sed' 'load_wikidata_base.sql' > load_wikidata_base.tmp.sql
    psql -h "$2" -d osm -U osm -t -f 'load_wikidata_base.tmp.sql'
fi

#psql -h "$2" -d osm -U osm -f 'osmium-osm2pgsql-convert.sql'
