@echo off

docker-compose --profile "dev" up -d

set source="%~1"
set sourceFile=%source:.\init\=%
docker-compose exec "web_dev" php ./init/db-init.php %sourceFile% %2 %3 %4 %5 %6
