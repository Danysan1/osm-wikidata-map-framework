#!/bin/bash

cd $(dirname "$0")
/usr/bin/git fetch
/usr/bin/git pull
/usr/local/bin/docker-compose --profile 'prod+promtail' pull
if [ '--build' == "$1" ]; then
    /usr/local/bin/docker-compose --profile 'prod+promtail' build
    /usr/local/bin/docker-compose --profile 'prod+promtail' push
fi
/usr/local/bin/docker-compose --profile 'prod+promtail' up --detach --always-recreate-deps
watch /usr/bin/docker ps
