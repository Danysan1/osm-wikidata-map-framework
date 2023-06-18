cd /D "%~dp0"
docker buildx bake owmf-web-prod --pull --push
