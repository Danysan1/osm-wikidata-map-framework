#!/bin/bash

#./osmium-spatialite.sh extract.osm.pbf


# https://www.postgresql.org/docs/9.3/libpq-envars.html
# https://www.postgresql.org/docs/9.3/libpq-pgpass.html
if [ -f .pgpass ]; then
    echo 'Using custom .pgpass'
else
    echo 'Using template .pgpass'
    cp template.pgpass .pgpass
fi
DB_HOST=$(cut -f 1 -d ':' .pgpass)
echo "Using DB at host '$DB_HOST'"
mv .pgpass ~/
chmod 0600 ~/.pgpass

#./osmium-postgis.sh extract.osm.pbf "$DB_HOST"
./osmium-osm2pgsql.sh extract.osm.pbf "$DB_HOST"
