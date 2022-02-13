#!/bin/sh

docker-compose up -d

fullSource=$1
sourceFile=$(echo "$fullSource" | sed 's:./web/::')
docker-compose exec web php db-init.php $sourceFile $2 $3
