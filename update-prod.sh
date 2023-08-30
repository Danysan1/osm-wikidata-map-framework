#!/bin/bash

cd $(dirname "$0")
/usr/bin/git fetch
/usr/bin/git pull

# https://docs.docker.com/compose/profiles/#enable-profiles
export COMPOSE_PROFILES=prod,promtail
/usr/local/bin/docker-compose pull
/usr/local/bin/docker-compose up --detach --always-recreate-deps
/usr/bin/docker image prune --all --force
/usr/bin/docker volume prune --force
watch /usr/bin/docker ps
