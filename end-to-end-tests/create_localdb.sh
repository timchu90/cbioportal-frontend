#!/usr/bin/env bash

set -e # fail when error occurs
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails
# shopt -s failglob # empty globs throw error

CURRENT_DIR=$PWD
TEST_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # get location of this script file
cd $TEST_HOME

# get configuration
eval $(python3 get_pullrequest_info.py $CI_PULL_REQUEST)
eval $(python3 read_portalporperties.py runtime-config/portal.properties)

# clone backend branch
cd /tmp
git clone --depth 1 -b $backend_branch_name "https://github.com/$backend_repo_name/cbioportal.git"
PORTAL_HOME=/tmp/cbioportal

# download db schema and seed data
curl https://raw.githubusercontent.com/cBioPortal/cbioportal/v2.0.0/db-scripts/src/main/resources/cgds.sql > cgds.sql
curl https://raw.githubusercontent.com/cBioPortal/datahub/master/seedDB/seed-cbioportal_hg19_v2.7.3.sql.gz > seed.sql.gz

MYSQL_DATA_DIR=/tmp/mysql_end-to-end_test
mkdir -p /tmp/mysql_end-to-end_test

docker network create endtoendlocaldb_default || true

# create local database from with cbioportal db and seed data
docker run -d \
    --name=$db_host \
    --net=endtoendlocaldb_default \
    -e MYSQL_ROOT_PASSWORD=$db_user \
    -e MYSQL_USER=$db_user \
    -e MYSQL_PASSWORD=$db_password \
    -e MYSQL_DATABASE=$db_portal_db_name \
    -p 127.0.0.1:3306:3306 \
    -v "$MYSQL_DATA_DIR:/var/lib/mysql/" \
    -v "/tmp/cgds.sql:/docker-entrypoint-initdb.d/cgds.sql:ro" \
    -v "/tmp/test/end-to-end_local_db/seed.sql.gz:/docker-entrypoint-initdb.d/seed_part1.sql.gz:ro" \
    mysql:5.7

while ! docker run --rm --net=endtoendlocaldb_default mysql:5.7 mysqladmin ping -u $db_user -p$db_password -h$db_portal_db_name --silent; do
    echo Waiting for cbioportal database to initialize...
    sleep 10
done

docker stop $db_host && docker rm $db_host

git clone --depth 1 -b master "https://github.com/$backend_repo_name/cbioportal.git"



# build backend 
docker build -f Dockerfile.local -t cbioportal:my-local-source-dir .docker run -d 


# echo Building docker containers ...
# docker-compose build

# # Note: --force-recreate flag is needed for selenium browser nodes to start correctly
# # (see: https://github.com/SeleniumHQ/docker-selenium/issues/91#issuecomment-167519978)
# docker-compose up -d --force-recreate

# # migrate database schema to most recent version
# echo Migrating database schema to most recent version ...
# docker-compose run --rm \
#     -v "$PORTAL_HOME/test/end-to-end_local_db/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
#     cbioportal \
#     python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql

# # sleep 5s

# # import all test studies into local database
# for DIR in $PORTAL_HOME/test/end-to-end_local_db/studies/*/ ; do
#     docker-compose run --rm \
#         --name=cbioportal-importer \
#         -v "$PORTAL_HOME/test/end-to-end_local_db/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
#         -v "$DIR:/study:ro" \
#         -v "$DIR:/outdir" \
#         cbioportal \
#         python3 /cbioportal/core/src/main/scripts/importer/metaImport.py \
#         --url_server http://cbioportal:8080 \
#         --study_directory /study \
#         --override_warning
# done

# # # spot visual regression by comparing screenshots in the repo with
# # # screenshots of this portal loaded with the data from the amazon db
# cd $PORTAL_HOME
# bash test/end-to-end_local_db/test_make_screenshots.sh test/end-to-end_local_db/screenshots.yml

# # stop cbioportal and selenium grid containers
# cd $TEST_HOME
# docker-compose stop

# # return to working directory
# cd $CURRENT_DIR