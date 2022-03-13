@echo off

docker-compose --profile "dev" up -d

set source="%~1"
set sourceFile=%source:.\web\=%
docker-compose exec "web_dev" php db-init.php %sourceFile% %2 %3 %4 %5
