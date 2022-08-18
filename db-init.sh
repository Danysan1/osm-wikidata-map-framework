#!/bin/sh

docker-compose --profile "dev" up -d

source="$1"
sourceFile=$(echo "$source" | sed 's:./db-init/::')
docker-compose exec "web_dev" php ./db-init/db-init.php $sourceFile $2 $3 $4 $5 $6
