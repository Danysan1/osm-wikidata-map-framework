# https://hub.docker.com/_/php
FROM php:8-apache-buster AS base
WORKDIR /var/www
# https://getcomposer.org/download/
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && \
	php -r "if (hash_file('sha384', 'composer-setup.php') === '756890a4488ce9024fc62c56153228907f1545c228516cbf63f885e036d37e9a59d27d63f46af1d4d07ee0f76181c7d3') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;" && \
	php composer-setup.php && \
	php -r "unlink('composer-setup.php');"
COPY ./composer.json /var/www/composer.json

# https://docs.docker.com/develop/develop-images/multistage-build/
# https://docs.docker.com/engine/reference/commandline/build/
FROM base AS dev
# https://gist.github.com/ben-albon/3c33628662dcd4120bf4
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
RUN apt-get update && \
	apt-get install -y libzip-dev zip git && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) zip
RUN php composer.phar install

FROM base AS prod
RUN apt-get update && \
	apt-get install -y libzip-dev zip && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) zip
RUN php composer.phar install --no-dev --optimize-autoloader && \
	rm composer.phar
COPY ./web /var/www/html
COPY ./open-etymology-map.template.ini /etc/open-etymology-map.ini

# docker login -u $REGISTRY_USER -p $REGISTRY_PASSWORD $REGISTRY
# docker build --target "dev" --tag open-etymology-map:dev .
# docker build --target "prod" --tag open-etymology-map:prod .
# docker push open-etymology-map
# docker rm open-etymology-map_instance
# docker run --name "open-etymology-map_instance" --publish "80:80" open-etymology-map:prod
