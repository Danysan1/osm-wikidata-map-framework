#!/bin/bash

# https://aws.amazon.com/marketplace/pp/prodview-l5gv52ndg5q6i

sudo apt update
sudo apt upgrade
sudo apt install apache2 php php-pgsql php-xml php-json postgresql postgresql-postgis certbot python3-certbot-apache

# https://postgis.net/install/
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql -c "CREATE USER oem WITH PASSWORD '!!REDACTED!!';"
sudo -u postgres psql -c "CREATE DATABASE oem OWNER oem;"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS postgis";
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS fuzzystrmatch";
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS postgis_topology";
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS hstore";

# https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-LAMP.html
# https://wiki.debian.org/it/LaMp
sudo systemctl start apache2
sudo systemctl enable apache2
sudo usermod -a -G www-data admin
sudo chown -R www-data:www-data /var/www
sudo chmod 2775 /var/www
find /var/www -type d -exec sudo chmod 2775 {} \;

#echo '<?php echo "PHP works!"; ?>' > /var/www/html/php.php

# https://certbot.eff.org/instructions?ws=apache&os=debianbuster
# sudo vim /etc/apache2/sites-available/000-default.conf
# sudo vim /etc/apache2/sites-available/default-ssl.conf
# sudo a2enmod ssl
# sudo systemctl restart apache2
# sudo certbot certonly --apache
# sudo certbot renew --dry-run
