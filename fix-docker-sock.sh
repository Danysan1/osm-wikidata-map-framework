#!/usr/bin/env bash

# This script is used to fix the permissions of the Docker socket so that Airflow DockerOperators can access it.
# It is supposed to be run inside the airflow-worker container.
# Currently the problem has been solved throudh Dockerfile+docker-compose.yml and this script is not used.
# Based on https://stackoverflow.com/a/69103823

# First, check if docker.sock is mounted
if ! [[ -S '/var/run/docker.sock' ]]; then 
    echo 'Docker unix sock not found. DockerOperators will not run.'
elif id -nG "airflow" | grep -qw "docker" && [ "$(stat -c %G /var/run/docker.sock)" == "docker" ]; then
    echo 'User airflow and docker.sock already share the docker group. DockerOperators should work correctly.'
elif [[ "$(whoami)" != "root" ]]; then
    echo "Not root, can't update Docker socket permissions. DockerOperators may not run."
else
    DOCKER_GID=`stat -c %g /var/run/docker.sock`
    [[ $DOCKER_GID -gt 0 ]] || DOCKER_GID=1001
    groupadd -g $DOCKER_GID docker
    usermod -aG docker airflow
    chown root:docker /var/run/docker.sock
    echo 'Docker unix sock found. DockerOperators should work correctly.'
fi