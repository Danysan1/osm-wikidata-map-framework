#!/bin/bash

# https://docs.osmcode.org/osmium/latest/osmium-export.html
# https://docs.osmcode.org/osmium/latest/osmium-extract.html
# https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html

set -e

if [ -z "$1" ]; then
    echo 'You must pass as argument the name of the .pbf input extract'
    exit 3
fi

if [ ! -f "$1" ]; then
    echo 'The file you passed as argument does not exist'
    exit 4
fi

if ! command -v osmium > /dev/null; then
    echo 'osmium is not installed'
    exit 5
fi

if [ ! -f "filtered_$1" ]; then
    echo '========================= Filtering OSM data... ========================='
    osmium tags-filter --verbose --overwrite -o "filtered_$1" "$1" 'name:etymology,name:etymology:wikidata,subject,subject:wikidata,wikidata'
fi

# if [ ! -f "filtered_$1.txt" ]; then
#     echo '========================= Exporting OSM data to text... ========================='
#     osmium export --verbose --overwrite -o "filtered_$1.txt" --config='osmium.json' "filtered_$1"
# fi

# if [ ! -f "filtered_$1.geojson" ]; then
#     echo '========================= Exporting OSM data to geojson... ========================='
#     osmium export --verbose --overwrite -o "filtered_$1.geojson" --config='osmium.json' --add-unique-id='counter' "filtered_$1"
# fi

if [ ! -f "filtered_$1.pg" ]; then
    echo '========================= Exporting OSM data to pg/tsv... ========================='
    osmium export --verbose --overwrite -o "filtered_$1.pg" --config='osmium.json' --add-unique-id='counter' "filtered_$1"
fi

if ! command -v sqlite3 > /dev/null; then
    echo 'sqlite3 is not installed'
    exit 6
elif ! sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')"; then
    echo 'spatialite 5 or above is required, it is not installed'
    exit 7
else
    spatialite=$(sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" 'SELECT spatialite_version()' | xargs)
    if [[ "$spatialite" == 3* ]] || [[ "$spatialite" == 4* ]]; then
        echo "spatialite 5 or above is required, $spatialite is installed"
        exit 8
    fi
fi

echo '========================= Preparing DB schema ========================='
sqlite3 'open-etymology-map.sqlite' '.read open-etymology-map-setup.sql'

echo '========================= Loading data into DB ========================='
sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" '.mode tabs' ".import filtered_$1.pg osmdata"
#SPATIALITE_SECURITY=relaxed sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" "SELECT ImportGeoJSON('filtered_$1.geojson', 'osmgeojson', 'geometry', true, 4326)"

echo '========================= Converting data ========================='
sqlite3 'open-etymology-map.sqlite' '.read open-etymology-map-convert.sql'
