#!/bin/bash
set -e

psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'postgis-convert.sql'

if [ -f 'get_wikidata_cods.tmp.json' ]; then
    echo '========================= Wikidata named-after data already downloaded ========================='
else
    echo '========================= Downloading Wikidata named-after data ========================='
    WIKIDATA_CODS=$(psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -c "SELECT STRING_AGG(DISTINCT 'wd:'||ew_wikidata_cod, ' ') FROM element_wikidata_cods WHERE NOT ew_etymology")
    echo "s/__ELEMENTS__/$WIKIDATA_CODS/g" > get_wikidata_cods.tmp.sed
    sed -f 'get_wikidata_cods.tmp.sed' 'get_named_after_ids.rq' > get_wikidata_cods.tmp.rq
    curl -X 'POST' --data-urlencode 'format=json' --data-urlencode 'query@get_wikidata_cods.tmp.rq' -o 'get_wikidata_cods.tmp.json' -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36" 'https://query.wikidata.org/sparql'
fi

if [ "$(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM wikidata_named_after" | xargs)" != '0' ]; then
    echo '========================= Wikidata named-after data already loaded into DB ========================='
else
    echo '========================= Loading Wikidata named-after data into DB ========================='
    WIKIDATA_JSON=$(cat get_wikidata_cods.tmp.json | tr -d '\n' | sed -e "s/'/''/g" -e 's/|/\\|/g' -e 's/\\/\\\\/g')
    echo "s|__WIKIDATA_JSON__|$WIKIDATA_JSON|g" > load_wikidata_cods.tmp.sed
    sed -f 'load_wikidata_cods.tmp.sed' 'load_wikidata_cods.sql' > load_wikidata_cods.tmp.sql
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -f 'load_wikidata_cods.tmp.sql'
fi


if [ $(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM etymology" | xargs) != '0' ]; then
    echo '========================= Etymology data already elaborated ========================='
else
    echo '========================= Elaborating etymology data ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -f 'osmium-convert.sql'
fi


if [ "$(psql -h "$2" -v ON_ERROR_STOP=1 -U osm -d osm -t -c "SELECT COUNT(*) FROM wikidata WHERE wd_download_date IS NULL AND wd_id IN (SELECT DISTINCT et_wd_id FROM etymology)" | xargs)" == '0' ]; then
    echo '========================= Wikidata base data already loaded into DB ========================='
else
    WIKIDATA_CODS=$(psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -c "SELECT STRING_AGG('wd:'||wd_wikidata_cod, ' ') FROM (SELECT wd_wikidata_cod FROM wikidata WHERE wd_download_date IS NULL AND wd_id IN (SELECT DISTINCT et_wd_id FROM etymology) LIMIT 1500) AS x" | xargs)
    while [ -n "$WIKIDATA_CODS" ]; do
        echo '========================= Downloading Wikidata base data ========================='
        echo "s/__WIKIDATA_CODS__/$WIKIDATA_CODS/g" > get_wikidata_base.tmp.sed
        sed -f 'get_wikidata_base.tmp.sed' 'get_wikidata_base.rq' > get_wikidata_base.tmp.rq
        curl -X 'POST' --data-urlencode 'format=json' --data-urlencode 'query@get_wikidata_base.tmp.rq' -o 'get_wikidata_base.tmp.json' -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36" 'https://query.wikidata.org/sparql' || (echo 'Download failed' && sleep 5)
        
        echo '========================= Loading Wikidata base data into DB ========================='
        WIKIDATA_JSON=$(cat get_wikidata_base.tmp.json | tr -d '\n' | sed -e "s/'/''/g" -e 's/|/\\|/g' -e 's/\\/\\\\/g')
        echo "s|__WIKIDATA_JSON__|$WIKIDATA_JSON|g" > load_wikidata_base.tmp.sed
        sed -f 'load_wikidata_base.tmp.sed' 'load_wikidata_base.sql' > load_wikidata_base.tmp.sql
        psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -f 'load_wikidata_base.tmp.sql'

        WIKIDATA_CODS=$(psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -c "SELECT STRING_AGG('wd:'||wd_wikidata_cod, ' ') FROM (SELECT wd_wikidata_cod FROM wikidata WHERE wd_download_date IS NULL AND wd_id IN (SELECT DISTINCT et_wd_id FROM etymology) LIMIT 1500) AS x" | xargs)
    done
fi


if [ -s 'global-map.tmp.geojson' ]; then 
    echo '========================= Global map already generated ========================='
else
    echo '========================= Generating global map ========================='
    psql -h "$2" -v ON_ERROR_STOP=1 -d osm -U osm -t -f 'generateGeoJSONGlobalMap.sql' > global-map.tmp.geojson
fi
