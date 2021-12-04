ARG pg_version=14.1-bullseye
FROM postgres:$pg_version

RUN apt-get update && \
    apt-get install -y osmium-tool osm2pgsql curl && \
    rm -rf /var/lib/apt/lists/*
