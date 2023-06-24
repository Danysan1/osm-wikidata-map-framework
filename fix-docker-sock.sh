# This script is used to fix the permissions of the Docker socket so that Airflow DockerOperators can access it.
# It is supposed to be run from the Docker host
# See https://stackoverflow.com/a/69103823

docker-compose exec --user root airflow-worker ls -l /var/run/
docker-compose exec --user root airflow-worker chgrp docker /var/run/docker.sock
docker-compose exec --user root airflow-worker chmod g+w /var/run/docker.sock
docker-compose exec --user root airflow-worker ls -l /var/run/
