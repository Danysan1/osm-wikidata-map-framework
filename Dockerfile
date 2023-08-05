# https://docs.docker.com/develop/develop-images/multistage-build/
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

# https://hub.docker.com/_/php
FROM php:8.2.8-apache-bullseye AS base
WORKDIR /var/www

RUN a2enmod headers ssl rewrite deflate expires

COPY ./apache.conf /etc/apache2/conf-available/owmf.conf
RUN a2enconf owmf.conf

# https://getcomposer.org/doc/faqs/how-to-install-composer-programmatically.md
RUN curl -s https://raw.githubusercontent.com/composer/getcomposer.org/76a7060ccb93902cd7576b67264ad91c8a2700e2/web/installer | php



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

COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.common.js", "./webpack.dev.js", "/var/www/"]
RUN npm install -g npm && \
	npm install



# https://docs.docker.com/language/nodejs/build-images/
FROM node:20.5.0-alpine AS npm-install
WORKDIR /npm_app
COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.common.js", "./webpack.prod.js", "/npm_app/"]
COPY "./src" "/npm_app/src"
RUN npm install && \
	npm run prod && \
	npm install --omit=dev

# https://blog.gitguardian.com/how-to-improve-your-docker-containers-security-cheat-sheet/
FROM base AS prod
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip certbot python3-certbot-apache libapache2-mod-security2 modsecurity-crs && \
	rm -rf /var/lib/apt/lists/*

# Setup mod_security - https://www.inmotionhosting.com/support/server/apache/install-modsecurity-apache-module/
RUN cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf && \
	sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' /etc/modsecurity/modsecurity.conf

# Install PHP extensions - https://hub.docker.com/_/php/
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
	docker-php-ext-install -j$(nproc) pdo_pgsql zip

# Install dependencies with Composer
COPY ["./composer.json", "./composer.lock", "/var/www/"]
RUN php composer.phar install --no-dev --no-scripts --no-plugins

# Optimize PHP autoloader
COPY --chown=www-data:www-data ./app /var/www/app
RUN php composer.phar dump-autoload --optimize --apcu && \
	rm composer.json composer.lock composer.phar

USER www-data

COPY --chown=www-data:www-data ./public /var/www/html
COPY --chown=www-data:www-data --from=npm-install /npm_app/public/dist /var/www/html/dist





# https://aws.amazon.com/it/blogs/compute/building-php-lambda-functions-with-docker-container-images/
# https://bref.sh/docs/web-apps/docker
# https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-types
# https://gallery.ecr.aws/lambda/provided
FROM bref/php-82-fpm-dev:2 as lambda-dev
COPY --from=bref/extra-pgsql-php-82 /opt /opt
COPY --from=prod /var/www /var/task
ENV HANDLER=html/lambda.php

FROM bref/php-82-fpm:2 as lambda-prod
COPY --from=bref/extra-pgsql-php-82 /opt /opt
COPY --from=prod /var/www /var/task
CMD ["html/lambda.php"]