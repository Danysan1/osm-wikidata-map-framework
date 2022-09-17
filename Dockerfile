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
COPY ./composer.json /var/www/composer.json



# https://docs.docker.com/engine/reference/commandline/build/
FROM base AS dev
# https://gist.github.com/ben-albon/3c33628662dcd4120bf4
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip git osmium-tool osm2pgsql npm && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) pdo_pgsql zip
RUN php composer.phar install
RUN npm install -g npm



FROM node:18-alpine AS npm-install
WORKDIR /app
COPY ./web /app
RUN npm install && \
	npm run prod && \
	npm install --production



# https://blog.gitguardian.com/how-to-improve-your-docker-containers-security-cheat-sheet/
FROM base AS prod
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip certbot python3-certbot-apache && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) pdo_pgsql zip

RUN php composer.phar install --no-dev --no-scripts --no-plugins --optimize-autoloader && \
	rm composer.phar

COPY --chown=www-data:www-data --from=npm-install /app /var/www/html
USER www-data
