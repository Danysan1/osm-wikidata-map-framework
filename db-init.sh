#!/bin/sh

docker-compose up -d

source="$1"
sourceFile=$(echo "$source" | sed 's:./web/::')
docker-compose exec web php db-init.php $sourceFile $2 $3
