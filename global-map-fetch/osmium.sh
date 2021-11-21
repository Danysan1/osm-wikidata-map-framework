#!/bin/bash
set -e

# https://docs.osmcode.org/osmium/latest/osmium-export.html
# https://docs.osmcode.org/osmium/latest/osmium-extract.html
# https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html

if [ ! -f "filtered_$1" ]; then
    echo '========================= Filtering OSM data... ========================='
    #osmium tags-filter --verbose --overwrite -o "filtered_$1" $1 'name:etymology,name:etymology:wikidata,subject,subject:wikidata,wikidata'
    osmium tags-filter --verbose --overwrite -o "filtered_$1" $1 'subject:wikidata'
fi

# if [ ! -f "filtered_$1.txt" ]; then
#     echo '========================= Exporting OSM data to text... ========================='
#     osmium export --verbose --overwrite -o "filtered_$1.txt" --config='osmium.json' "filtered_$1"
# fi

if [ ! -f "filtered_$1.geojson" ]; then
    echo '========================= Exporting OSM data to geojson... ========================='
    osmium export --verbose --overwrite -o "filtered_$1.geojson" --config='osmium.json' --add-unique-id='counter' "filtered_$1"
fi

# if [ ! -f "filtered_$1.pg" ]; then
#     echo '========================= Exporting OSM data to pg/tsv... ========================='
#     osmium export --verbose --overwrite -o "filtered_$1.pg" --config='osmium.json' --add-unique-id='counter' "filtered_$1"
# fi

echo '========================= Preparing DB schema ========================='
sqlite3 'open-etymology-map.sqlite' '.read open-etymology-map-setup.sql'

echo '========================= Loading data into DB ========================='
#sqlite3 'open-etymology-map.sqlite' '.mode tabs' ".import filtered_$1.pg osmdata"
SPATIALITE_SECURITY=relaxed sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" "SELECT ImportGeoJSON('filtered_$1.geojson', 'osmgeojson', 'geometry', true, 4326)"

echo '========================= Converting data ========================='
sqlite3 'open-etymology-map.sqlite' '.read open-etymology-map-convert.sql'
