#!/bin/bash
> osmium.log

#./osmium-spatialite.sh extract.osm.pbf 2>&1 | tee -a osmium.log

echo '========================= Starting import procedure ========================='

# https://www.postgresql.org/docs/14/libpq-envars.html
# https://www.postgresql.org/docs/14/libpq-pgpass.html
if [ -f .pgpass ]; then
    echo 'Using custom .pgpass' | tee -a osmium.log
    mv .pgpass ~/
    chmod 0600 ~/.pgpass
elif [ -f ~/.pgpass ]; then
    echo 'Using existing .pgpass' | tee -a osmium.log
else
    echo 'Using template .pgpass' | tee -a osmium.log
    cp template.pgpass ~/.pgpass
    chmod 0600 ~/.pgpass
fi
DB_HOST=$(cut -f 1 -d ':' ~/.pgpass)
echo "Using DB at host '$DB_HOST'" | tee -a osmium.log

./osmium-postgis.sh extract.osm.pbf "$DB_HOST" 2>&1 | tee -a osmium.log
#./osmium-osm2pgsql.sh extract.osm.pbf "$DB_HOST" 2>&1 | tee -a osmium.log

echo '========================= Ending import procedure ========================='
