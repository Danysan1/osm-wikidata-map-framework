# https://docs.docker.com/develop/develop-images/multistage-build/
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

# https://hub.docker.com/_/php
FROM php:8.1-apache-bullseye AS base
WORKDIR /var/www

RUN a2enmod headers ssl rewrite deflate

COPY ./apache-only-get.conf /etc/apache2/conf-available/only-get.conf
RUN a2enconf only-get.conf

COPY ./composer_install.sh ./composer_install.sh
RUN chmod +x ./composer_install.sh && ./composer_install.sh



# https://docs.docker.com/engine/reference/commandline/build/
FROM base AS dev
# https://gist.github.com/ben-albon/3c33628662dcd4120bf4
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip git npm && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" && \
	docker-php-ext-install -j$(nproc) pdo_pgsql zip

COPY ["./composer.json", "./composer.lock", "/var/www/"]
RUN php composer.phar install

COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.config.js", "/var/www/"]
RUN npm install -g npm && \
	npm install



# https://docs.docker.com/language/nodejs/build-images/
FROM node:18-alpine AS npm-install
WORKDIR /app
COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.config.js", "/app/"]
COPY "./src" "/app/src"
RUN npm install && \
	npm run prod && \
	npm install --production



# https://blog.gitguardian.com/how-to-improve-your-docker-containers-security-cheat-sheet/
FROM base AS prod
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip certbot python3-certbot-apache && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
	docker-php-ext-install -j$(nproc) pdo_pgsql zip

COPY ["./composer.json", "./composer.lock", "/var/www/"]
RUN php composer.phar install --no-dev --no-scripts --no-plugins --optimize-autoloader && \
	rm composer.json composer.lock composer.phar

COPY --chown=www-data:www-data ./web /var/www/html
COPY --chown=www-data:www-data --from=npm-install /app/web/dist /var/www/html/dist
USER www-data



FROM apache/airflow:slim-2.4.0 as airflow
USER root
RUN apt-get update && \
	apt-get install -y libpq-dev gcc && \
	rm -rf /var/lib/apt/lists/*
USER airflow
RUN pip install apache-airflow[celery,postgres,docker,redis]
