#!/bin/bash
cd $(dirname "$0")
git fetch
git pull
/usr/local/bin/docker-compose --profile 'prod' pull
/usr/local/bin/docker-compose --profile 'prod' build
/usr/local/bin/docker-compose --profile 'prod' up -d

