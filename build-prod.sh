#!/bin/sh
cd $(dirname "$0")
docker buildx bake oem-web-prod --pull --push
