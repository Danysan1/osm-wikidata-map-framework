@echo off

docker-compose up -d

set source="%~1"
set sourceFile=%source:.\web\=%
docker-compose exec web php db-init.php %sourceFile% %2 %3
