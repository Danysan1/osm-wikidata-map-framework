# https://hub.docker.com/_/php
FROM php:8.1-apache-buster AS base
WORKDIR /var/www

COPY ./composer_install.sh ./composer_install.sh
RUN chmod +x ./composer_install.sh && ./composer_install.sh
COPY ./composer.json /var/www/composer.json

# https://docs.docker.com/develop/develop-images/multistage-build/
# https://docs.docker.com/engine/reference/commandline/build/
FROM base AS dev
# https://gist.github.com/ben-albon/3c33628662dcd4120bf4
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip git && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) pdo_pgsql zip
RUN php composer.phar install

# https://blog.gitguardian.com/how-to-improve-your-docker-containers-security-cheat-sheet/
FROM base AS prod
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
RUN docker-php-ext-install -j$(nproc) pdo_pgsql zip

RUN php composer.phar install --no-dev --no-scripts --no-plugins --optimize-autoloader && \
	rm composer.phar

#USER www-data
COPY --chown=www-data:www-data ./web /var/www/html
COPY ./open-etymology-map.template.ini /var/www/html/open-etymology-map.ini
RUN touch /var/www/html/open-etymology-map.log

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash && \
	chmod +x $HOME/.nvm/nvm.sh && \
	. $HOME/.nvm/nvm.sh && \
	rm $HOME/.nvm/nvm.sh && \
	nvm install --lts && \
	cd /var/www/html && \
	npm install --force --production

# docker login -u $REGISTRY_USER -p $REGISTRY_PASSWORD $REGISTRY
# docker build --target "dev" --tag open-etymology-map:dev .
# docker build --target "prod" --tag open-etymology-map:prod .
# docker push open-etymology-map
# docker rm open-etymology-map_instance
# docker run --name "open-etymology-map_instance" --publish "80:80" open-etymology-map:prod
