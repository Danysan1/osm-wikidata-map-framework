REM https://github.com/docker/buildx
REM https://stackoverflow.com/a/72050139/2347196

SET COMPOSE_DOCKER_CLI_BUILD=1
SET DOCKER_BUILDKIT=1
SET DOCKER_DEFAULT_PLATFORM=linux/arm64
docker-compose --profile prod pull
docker-compose --profile prod build
docker-compose --profile prod push
