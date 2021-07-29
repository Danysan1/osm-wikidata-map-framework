FROM php:8-apache-buster AS base

FROM base AS dev

FROM base AS prod
COPY ./web /var/www/html
COPY ./open-etymology-map.ini /etc/open-etymology-map.ini