#!/usr/bin/env bash

set -e # fail when error occurs
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails
# shopt -s failglob # empty globs throw error

CURRENT_DIR=$PWD
TEST_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # get location of this script file
cd $TEST_HOME

# get configuration
#   pullrequest_repo_name       -> name of source PR repository (e.g. 'cbioportal-frontend')
#   pullrequest_branch_name     -> branch name of source PR (e.g. 'superawesome_feature_branch')
#   pullrequest_base_repo_name  -> name of source PR repository (e.g. 'cbioportal-frontend')
#   pullrequest_base_branch_name-> branch name of source PR (e.g. 'superawesome_feature_branch')
#   pullrequest_commit_hash     -> branch name source PR repository (e.g. '3as8sAs4')
#   backend_repo_name           -> name of base repository (e.g. 'cbioportal-frontend')
#   backend_branch_name         -> name of base branch (e.g. 'rc')
eval $(python3 get_pullrequest_info.py $CI_PULL_REQUEST)
eval $(python3 read_portalproperties.py runtime-config/portal.properties)

# clone backend branch
cd /tmp
PORTAL_HOME=/tmp/cbioportal

# download db schema and seed data
curl https://raw.githubusercontent.com/cBioPortal/cbioportal/v2.0.0/db-scripts/src/main/resources/cgds.sql > cgds.sql
curl https://raw.githubusercontent.com/cBioPortal/datahub/master/seedDB/seed-cbioportal_hg19_v2.7.3.sql.gz > seed.sql.gz

MYSQL_DATA_DIR=/tmp/mysql_end-to-end_test
mkdir -p $MYSQL_DATA_DIR

docker network create endtoendlocaldb_default || true

# create local database from with cbioportal db and seed data
docker stop $db_host && docker rm $db_host # TODO remove in production code
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
    -v "/tmp/seed.sql.gz:/docker-entrypoint-initdb.d/seed_part1.sql.gz:ro" \
    mysql:5.7

while ! docker run --rm --net=endtoendlocaldb_default mysql:5.7 mysqladmin ping -u $db_user -p$db_password -h$db_host --silent; do
    echo Waiting for cbioportal database to initialize...
    sleep 10
done

docker stop $db_host && docker rm $db_host

# groupIds: com.github.thehyve com.github.cbioportal

build_backend($backend_branch_name, $backend_repo_url, $frontend_version, $frontend_groupId) {

    docker stop cbioportal-backend-endtoend && docker rm cbioportal-backend-endtoend
    git clone --depth 1 -b $backend_branch_name $backend_repo_url
    cp $TEST_HOME/docker_images/Dockerfile.local cbioportal
    cp $TEST_HOME/docker_images/catalina_server.xml.patch cbioportal
    cp $TEST_HOME/runtime-config/portal.properties cbioportal
    cd cbioportal
    export FRONTEND_VERSION=$frontend_version
    export FRONTEND_GROUPID=$frontend_groupId
    docker build -f Dockerfile.local -t cbioportal

}

# cBioportal-frontend pull requests to rc are tested against cbioportal backend rc branch
# cBioportal-frontend pull requests to master are tested against cbioportal backend master branch
# An optional specific backend branch can be provided by including a BACKEND_BRANCH= parameter in the body.
# This backend branch will also be tested.

rm -rf cbioportal
build_backend($backend_branch_name, $backend_repo_url, $pullrequest_commit_hash, )


BACKEND_

# build backend

# migrate database schema to most recent version
echo Migrating database schema to most recent version ...
docker-compose run --rm \
    -v "$PORTAL_HOME/test/end-to-end_local_db/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
    cbioportal-backend-endtoend \
    python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql


