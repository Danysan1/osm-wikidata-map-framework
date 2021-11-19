#!/bin/bash
# https://docs.osmcode.org/osmium/latest/osmium-export.html
osmium-extract -c "osmium_extract.json" -o "osm.pg" $1