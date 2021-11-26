#!/bin/bash
set -e

./osmium.sh "$1" "$2" 'pg'

echo '========================= Checking Spatialite version ========================='

if ! command -v sqlite3 > /dev/null; then
    echo 'sqlite3 is not installed'
    exit 50
elif ! sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')"; then
    echo 'spatialite 5 or above is required, it is not installed'
    exit 60
else
    spatialite=$(sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" 'SELECT spatialite_version()' | xargs)
    if [[ "$spatialite" == 3* ]] || [[ "$spatialite" == 4* ]]; then
        echo "spatialite 5 or above is required, $spatialite is installed"
        exit 70
    fi
fi

echo '========================= Preparing DB schema ========================='
sqlite3 'open-etymology-map.sqlite' '.read osmium-spatialite-setup.sql'

echo '========================= Loading data into DB ========================='
sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" '.mode tabs' ".import filtered_$1.pg osmdata"
#SPATIALITE_SECURITY=relaxed sqlite3 'open-etymology-map.sqlite' "SELECT load_extension('mod_spatialite')" "SELECT ImportGeoJSON('filtered_$1.geojson', 'osmgeojson', 'geometry', true, 4326)"

echo '========================= Converting data ========================='
sqlite3 'open-etymology-map.sqlite' '.read osmium-spatialite-convert.sql'
