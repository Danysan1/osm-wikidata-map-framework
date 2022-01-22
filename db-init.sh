#!/bin/sh
docker-compose up -d
docker-compose exec web php db-init.php $1 $2 $3
