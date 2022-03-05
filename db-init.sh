#!/bin/sh

docker-compose --profile "dev" up -d

source="$1"
sourceFile=$(echo "$source" | sed 's:./web/::')
docker-compose exec "web_dev" php db-init.php $sourceFile $2 $3 $4
