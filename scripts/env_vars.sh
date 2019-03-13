#!/usr/bin/env bash
# eval output of this file to get appropriate env variables e.g. eval "$(./env_vars.sh)"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RED='\033[0;31m'
NC='\033[0m'

if [[ "$CIRCLECI" ]]; then

    if [[ "$E2E_LOCALDB" ]]; then
        # When on circle ci and using dockers that host a custom cbioportal
        # portal and database use env vars that point to this docker.
        # For local database tests evaluation of PR branch is perfored by
        # the get_pullrequest_info.py script.
        BACKEND=e2e_localdb
    else
        # on circle ci determine env variables based on branch or in case of PR
        # what branch the PR is pointing to
        if [[ "$CIRCLE_PR_NUMBER" ]] && ! [[ $CIRCLE_BRANCH == "release-"* ]]; then
            BRANCH=$(curl "https://github.com/cBioPortal/cbioportal-frontend/pull/${CIRCLE_PR_NUMBER}" | grep -oE 'title="cBioPortal/cbioportal-frontend:[^"]*' | cut -d: -f2 | head -1)
        elif [[ "$CIRCLE_PULL_REQUEST" ]] && ! [[ $CIRCLE_BRANCH == "release-"* ]]; then
            BRANCH=$(curl "${CIRCLE_PULL_REQUEST}" | grep -oE 'title="cBioPortal/cbioportal-frontend:[^"]*' | cut -d: -f2 | head -1)
        else
            BRANCH=$CIRCLE_BRANCH
        fi
        # here we will set respective external backends for some of the tests (e.g. if PR is to frontend master, then use master backend)
        BACKEND=$BRANCH
    fi

    cat $SCRIPT_DIR/../env/${BACKEND}.sh
elif [[ "$BRANCH_ENV" ]]; then
    cat $SCRIPT_DIR/../env/${BRANCH_ENV}.sh

    # override with custom exports if they exist
    if [[ -f ${SCRIPT_DIR}/../env/custom.sh ]]; then
        cat ${SCRIPT_DIR}/../env/custom.sh
    fi
else
    echo -e "${RED}No desired BRANCH_ENV variable set${NC}"
    echo -e "${RED}set with e.g. export BRANCH_ENV=master${NC}"
    echo -e "${RED}or export BRANCH_ENV=rc${NC}"
    exit 1
fi
