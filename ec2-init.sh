#!/bin/bash

## https://docs.aws.amazon.com/AmazonECS/latest/developerguide/docker-basics.html#install_docker

sudo yum update -y
sudo yum install git -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

## https://gist.github.com/npearce/6f3c7826c7499587f00957fee62f8ee9

sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose version

## https://gitlab.com/dsantini/open-etymology-map/-/blob/main/CONTRIBUTING.md

git clone https://gitlab.com/dsantini/open-etymology-map.git
cd open-etymology-map
cp open-etymology-map.template.ini web/open-etymology-map.ini
> web/global-map.geojson
> web/LAST_UPDATE
> web/open-etymology-map.log
docker-compose --profile "prod" pull
docker-compose --profile "prod" up -d

## https://certbot.eff.org/instructions?ws=apache&os=debianbuster

docker-compose exec web_prod certbot --apache
## Rinnovo: docker-compose exec web_prod certbot renew


## Update: cd open-etymology-map && git fetch && git pull && docker-compose --profile 'prod' build && docker-compose --profile 'prod' up -d
## Logs: docker-compose logs
