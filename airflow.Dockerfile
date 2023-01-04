# https://airflow.apache.org/docs/docker-stack/build.html#adding-packages-from-requirements-txt
FROM apache/airflow:slim-2.4.1
USER root
RUN apt-get update && \
	apt-get install -y libpq-dev gcc && \
	rm -rf /var/lib/apt/lists/*
USER airflow

COPY requirements.txt /
RUN pip install --no-cache-dir -r /requirements.txt
