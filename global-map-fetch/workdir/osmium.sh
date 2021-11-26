#!/bin/bash

# https://docs.osmcode.org/osmium/latest/osmium-export.html
# https://docs.osmcode.org/osmium/latest/osmium-extract.html
# https://docs.osmcode.org/osmium/latest/osmium-tags-filter.html

set -e

if [ -z "$1" ]; then
    echo 'You must pass as first argument the name of the .pbf input extract'
    exit 10
fi

if [ ! -f "$1" ]; then
    echo 'The file you passed as first argument does not exist'
    exit 20
fi

if ! command -v osmium > /dev/null; then
    echo 'osmium is not installed'
    exit 30
else
    osmium_version=$( osmium --version | egrep '^osmium version' | cut -d ' ' -f 3 )
    if [[ "$osmium_version" == 1.1 ]] || [[ "$osmium_version" != 1.1* ]]; then
        echo "osmium 1.10 or above is required, $osmium_version is installed"
        exit 40
    fi
fi

if [ ! -f "filtered_$1" ]; then
    echo '========================= Filtering OSM data... ========================='
    osmium tags-filter --verbose --overwrite -o "filtered_$1" "$1" 'name:etymology,name:etymology:wikidata,subject,subject:wikidata,wikidata'
else
    echo '========================= Data already filtered ========================='
fi

if [ -f "filtered_$1.txt" ]; then
    echo '========================= Data already exported to text ========================='
elif [ "$3" = 'txt' ]; then
    echo '========================= Exporting OSM data to text... ========================='
    osmium export --verbose --overwrite -o "filtered_$1.txt" -f 'text' --config='osmium.json' "filtered_$1"
fi

if [ -f "filtered_$1.geojson" ]; then
    echo '========================= Data already exported to geojson ========================='
elif [ "$3" = 'geojson' ]; then
    echo '========================= Exporting OSM data to geojson... ========================='
    osmium export --verbose --overwrite -o "filtered_$1.geojson" -f 'geojson' --config='osmium.json' --add-unique-id='counter' "filtered_$1"
fi


if [ -f "filtered_$1.pg" ]; then
    echo '========================= Data already exported to PostGIS tsv ========================='
elif [ "$3" = 'pg' ]; then
    echo '========================= Exporting OSM data to PostGIS tsv... ========================='
    osmium export --verbose --overwrite -o "filtered_$1.pg" -f 'pg' --config='osmium.json' --add-unique-id='counter' "filtered_$1"
fi
