#!/bin/sh
cd $(dirname "$0")
docker buildx bake owmf-web-prod --pull --push
