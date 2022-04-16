#!/bin/bash
cd open-etymology-map
git fetch
git pull
docker-compose --profile 'prod' pull
docker-compose --profile 'prod' build
docker-compose --profile 'prod' up -d
