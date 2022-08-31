#!/bin/sh

docker-compose --profile "dev" up -d
docker-compose exec "web_dev" php ./init/db-init.php "$@"
