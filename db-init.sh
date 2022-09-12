#!/bin/sh

docker-compose --profile "dev" up -d
docker-compose exec "oem-web-dev" php ./init/db-init.php "$@"
