FROM postgres:14-bullseye

RUN apt-get update && \
    apt-get install -y osmium-tool osm2pgsql && \
    rm -rf /var/lib/apt/lists/*
