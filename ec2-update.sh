#!/bin/bash

cd $(dirname "$0")
/usr/bin/git fetch
/usr/bin/git pull
/usr/local/bin/docker-compose --profile 'prod' pull
if [ '--build' == "$1" ]; then
    /usr/local/bin/docker-compose --profile 'prod' build
    /usr/local/bin/docker-compose --profile 'prod' push
fi
/usr/local/bin/docker-compose --profile 'prod' up --detach --always-recreate-deps
timeout 20 watch /usr/bin/docker ps
