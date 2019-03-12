#!/usr/bin/python3

import sys
import json
import requests
import re

issue_number=sys.argv[1]

url = "https://api.github.com/repos/cBioPortal/cbioportal-frontend/pulls/"+issue_number

myResponse = requests.get(url)

# For successful API call, response code will be 200 (OK)
if(myResponse.ok):

    # Loading the response data into a dict variable
    # json.loads takes in only binary or string variables so using content to fetch binary content
    # Loads (Load String) takes a Json file and converts into python data structure (dict or list, depending on JSON)
    jData = json.loads(myResponse.content)

    frontend_branch_name = jData['head']['ref']
    frontend_commit_hash = jData['head']['sha']
    frontend_organization = jData['head']['repo']['full_name'].split("/")[0].lower()
    frontend_repo_name = jData['head']['repo']['name']

    frontend_base_branch_name = jData['base']['ref']
    frontend_base_commit_hash = jData['base']['sha']
    frontend_base_organization = jData['base']['repo']['full_name'].split("/")[0].lower()
    frontend_base_repo_name = jData['base']['repo']['name']

    backend_organization = ""
    backend_branch_name = ""
    pr_match = re.search(r"BACKEND_BRANCH=([^\s]+):([^\s]+)", jData['body'])
    if pr_match is not None :
        backend_organization = pr_match.group(1).lower()
        backend_branch_name = pr_match.group(2)

    print(
      "frontend_branch_name="+ frontend_branch_name + "\n"
      "frontend_commit_hash="+ frontend_commit_hash + "\n"
      "frontend_organization="+ frontend_organization + "\n"
      "frontend_repo_name="+ frontend_repo_name + "\n"
      "frontend_base_branch_name="+ frontend_base_branch_name + "\n"
      "frontend_base_commit_hash="+ frontend_base_commit_hash + "\n"
      "frontend_base_organization="+ frontend_base_organization + "\n"
      "frontend_repo_name="+ frontend_repo_name + "\n"
      "backend_organization="+ backend_organization + "\n"
      "backend_branch_name="+ backend_branch_name)

else:
  # If response code is not ok (200), print the resulting http error code with description
    myResponse.raise_for_status()