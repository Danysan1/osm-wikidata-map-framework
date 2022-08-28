#!/bin/bash

cd $(dirname "$0")
/usr/bin/git fetch
/usr/bin/git pull
/usr/local/bin/docker-compose --profile 'prod' pull
/usr/local/bin/docker-compose --profile 'prod' up --build --detach --always-recreate-deps
/usr/local/bin/docker-compose --profile 'prod' push  # Upload arm builds, not buildable with CI
