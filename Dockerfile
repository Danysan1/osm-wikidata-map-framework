# https://docs.docker.com/develop/develop-images/multistage-build/
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

# https://hub.docker.com/_/php
FROM php:8.3.4-apache-bookworm AS base
WORKDIR /var/www

RUN a2enmod headers ssl rewrite deflate expires proxy proxy_http

COPY ./apache.conf /etc/apache2/conf-available/owmf.conf
RUN a2enconf owmf.conf

# https://getcomposer.org/doc/faqs/how-to-install-composer-programmatically.md
RUN curl -s https://raw.githubusercontent.com/composer/getcomposer.org/76a7060ccb93902cd7576b67264ad91c8a2700e2/web/installer | php



# https://docs.docker.com/engine/reference/commandline/build/
FROM base AS dev
# https://github.com/nodesource/distributions#installation-instructions
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip git ca-certificates curl gnupg && \
	mkdir -p /etc/apt/keyrings && \
	curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
	echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
	apt-get update && \
	apt-get install -y nodejs && \
	rm -rf /var/lib/apt/lists/*
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini" && \
	docker-php-ext-install -j$(nproc) pdo_pgsql zip

COPY ["./composer.json", "./composer.lock", "/var/www/"]
RUN php composer.phar install

COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.common.js", "./webpack.dev.js", "/var/www/"]
RUN npm install -g npm && \
	npm install



# https://docs.docker.com/language/nodejs/build-images/
FROM node:21.7.2-alpine AS npm-install
WORKDIR /npm_app
COPY ["./package.json", "./package-lock.json", "./tsconfig.json", "./webpack.common.js", "./webpack.prod.js", "/npm_app/"]
COPY "./src" "/npm_app/src"
RUN npm install && \
	npm run prod && \
	npm install --omit=dev

# https://blog.gitguardian.com/how-to-improve-your-docker-containers-security-cheat-sheet/
FROM base AS prod
RUN apt-get update && \
	apt-get install -y libpq-dev libzip-dev zip certbot python3-certbot-apache libapache2-mod-evasive libapache2-mod-security2 modsecurity-crs && \
	rm -rf /var/lib/apt/lists/*

# Setup mod_security - https://www.inmotionhosting.com/support/server/apache/install-modsecurity-apache-module/
COPY ./99_owmf_security.conf /etc/modsecurity/99_owmf_security.conf
RUN cp /etc/modsecurity/modsecurity.conf-recommended /etc/modsecurity/modsecurity.conf && \
	sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' /etc/modsecurity/modsecurity.conf && \
	sed -i 's/ServerTokens OS/ServerTokens Prod/' /etc/apache2/conf-available/security.conf

# Install PHP extensions - https://hub.docker.com/_/php/
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" && \
	sed -i 's/expose_php = On/expose_php = Off/' "$PHP_INI_DIR/php.ini" && \
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
