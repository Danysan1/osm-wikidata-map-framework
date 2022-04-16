#!/bin/bash
cd $(dirname "$0")
git fetch
git pull
docker-compose --profile 'prod' pull
#docker-compose --profile 'prod' build
docker-compose --profile 'prod' up -d
