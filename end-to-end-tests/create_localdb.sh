#!/usr/bin/env bash

set -e 
set -u # unset variables throw error
set -o pipefail # pipes fail when partial command fails
# shopt -s failglob # empty globs throw error

CI_PULL_REQUEST=$1

check_download_frontend_build() {
    # check whether jitpack versions for the frontend exit
    org=$1
    version=$2
    url="https://jitpack.io/com/github/$org/cbioportal-frontend/$version/cbioportal-frontend-$version.jar"
    # curl -s --head $url | head -n 1 | grep "HTTP/2 200"
    if !( curl -s --head $url | head -n 1 | grep "HTTP/2 200") ; then
        echo "Could not find frontend .jar (version: $version, org: $org) at jitpack (url: $url)"
        exit
    fi
}

download_db_seed() {
    # download db schema and seed data
    CURDIR=$PWD
    cd /tmp
    curl https://raw.githubusercontent.com/cBioPortal/cbioportal/v2.0.0/db-scripts/src/main/resources/cgds.sql > cgds.sql
    curl https://raw.githubusercontent.com/cBioPortal/datahub/master/seedDB/seed-cbioportal_hg19_v2.7.3.sql.gz > seed.sql.gz
    cd $CURDIR
}

create_db_docker() {
    # create local database from with cbioportal db and seed data
    download_db_seed
    docker volume rm MYSQL_DATA_DIR 2> /dev/null || true
    docker stop $db_host && docker rm $db_host # TODO remove in production code
    docker run -d \
        --name=$db_host \
        --net=endtoendlocaldb_default \
        -e MYSQL_ROOT_PASSWORD=$db_user \
        -e MYSQL_USER=$db_user \
        -e MYSQL_PASSWORD=$db_password \
        -e MYSQL_DATABASE=$db_portal_db_name \
        -p 127.0.0.1:3306:3306 \
        -v "MYSQL_DATA_DIR:/var/lib/mysql/" \
        -v "/tmp/cgds.sql:/docker-entrypoint-initdb.d/cgds.sql:ro" \
        -v "/tmp/seed.sql.gz:/docker-entrypoint-initdb.d/seed_part1.sql.gz:ro" \
        mysql:5.7

    while ! docker run --rm --net=endtoendlocaldb_default mysql:5.7 mysqladmin ping -u $db_user -p$db_password -h$db_host --silent; do
        echo Waiting for cbioportal database to initialize...
        sleep 10
    done
}

build_and_run_backend() {

    backend_branch_name=$1
    backend_organization=$2
    frontend_commit_hash=$3
    frontend_groupId=$4

    CURDIR=$PWD
    
    cd /tmp
    rm -rf cbioportal
    git clone --depth 1 -b $backend_branch_name "https://github.com/$backend_organization/cbioportal.git"
    (docker stop $cbioportal_host 2> /dev/null && docker rm $cbioportal_host  2> /dev/null) || true 
    cp $TEST_HOME/docker_images/* cbioportal
    cp $TEST_HOME/runtime-config/portal.properties cbioportal
    cd cbioportal
    export FRONTEND_VERSION=$frontend_commit_hash
    export FRONTEND_GROUPID=$frontend_groupId
    # docker build -f Dockerfile.local -t cbioportal-backend-endtoend .
    docker rm cbioportal-endtoend-image 2> /dev/null || true
    docker build -f Dockerfile -t cbioportal-endtoend-image . --build-arg FRONTEND_VERSION --build-arg FRONTEND_GROUPID

    # migrate database schema to most recent version
    echo Migrating database schema to most recent version ...
    docker run --rm \
        --net=endtoendlocaldb_default \
        -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
        cbioportal-endtoend-image \
        python3 /cbioportal/core/src/main/scripts/migrate_db.py -y -p /cbioportal/portal.properties -s /cbioportal/db-scripts/src/main/resources/migration.sql

    # start cbioportal
    docker run -d --restart=always \
        --name=$cbioportal_host \
        --net=endtoendlocaldb_default \
        -e CATALINA_OPTS='-Xms2g -Xmx4g' \
        -p 127.0.0.1:8000:8000 \
        -p 8081:8080 \
        cbioportal-endtoend-image \
        catalina.sh jpda run

    cd $CURDIR
}

load_studies_in_db() {

    for DIR in $TEST_HOME/end-to-end-tests/studies/*/ ; do
        docker run --rm \
            --name=cbioportal-importer \
            --net=endtoendlocaldb_default \
            -v "$TEST_HOME/runtime-config/portal.properties:/cbioportal/portal.properties:ro" \
            -v "$DIR:/study:ro" \
            -v "$DIR:/outdir" \
            cbioportal-endtoend-image \
            python3 /cbioportal/core/src/main/scripts/importer/metaImport.py \
            --url_server http://$cbioportal_host:8080 \
            --study_directory /study \
            --override_warning
    done

}

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
cbioportal_host=cbioportale2e

docker network create endtoendlocaldb_default || true

MYSQL_DATA_DIR=/tmp/mysql_end-to-end_test
mkdir -p $MYSQL_DATA_DIR

# cBioportal-frontend pull requests to rc are tested against cbioportal backend rc branch
# cBioportal-frontend pull requests to master are tested against cbioportal backend master branch
# An optional specific backend branch can be provided by including a BACKEND_BRANCH= parameter in the body.
# This backend branch will also be tested.

# build backend docker that hosts the frontend branch of the pr

backend_branch_name="migration_script_flag_no_confirmation" # remove in final version
backend_organization="thehyve" # remove in final version
frontend_version="93d9cbcbf007ff620ab51ef5af5927a0eb1ebed4" # replace with `$frontend_commit_hash` in final version
frontend_groupId="com.github.$frontend_organization"

check_download_frontend_build $frontend_organization $frontend_version

# when a specific branch name was mentioned in the PR body (via the BACKEND_BRANCH=... parameter)
# a docker with this backend is creates and tested 
if [[ $backend_branch_name != "" ]] ; then
    create_db_docker
    build_and_run_backend $backend_branch_name $backend_organization $frontend_commit_hash $frontend_groupId
    load_studies_in_db
    # run tests for specified 
    echo RUNNING TESTS 1!!!!!!!
fi

# create and run docker with cbioportal backend equal to frontend base repo
# e.g., cbioportal-frontend `master` base branch->bioportal `master` branch)
backend_branch_name=$frontend_base_branch_name
backend_organization="cbioportal"
    create_db_docker
    build_and_run_backend $backend_branch_name $backend_organization $frontend_commit_hash $frontend_groupId
    load_studies_in_db

    # run tests
    echo RUNNING TESTS 2!!!!!!!