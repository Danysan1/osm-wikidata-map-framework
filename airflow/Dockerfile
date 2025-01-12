# https://airflow.apache.org/docs/docker-stack/build.html#adding-packages-from-requirements-txt
FROM apache/airflow:slim-2.10.3-python3.12

USER root
RUN apt-get update && \
	apt-get install -y libpq-dev gcc && \
	rm -rf /var/lib/apt/lists/*
ARG DOCKER_GID=1001
RUN groupadd -g $DOCKER_GID docker && \
	usermod -aG docker airflow

USER airflow
COPY "./requirements.txt" /
RUN pip install --no-cache-dir -r /requirements.txt
