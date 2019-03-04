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

    base_repo_name = jData['base']['label']
    base_repo_hash = jData['base']['sha']
    backend_branch_name = ""
    backend_branch_commit = ""
    pr_match = re.search(r"BACKEND_BRANCH=([^\s]+)", jData['body'])
    # pr_match = re.search(r"BACKEND_BRANCH=([^\s]+)", jData['body'])
    if pr_match is not None :
        backend_commit = pr_match.group(1)
    print(base_repo_name+" "+base_repo_hash+" "+backend_commit)

else:
  # If response code is not ok (200), print the resulting http error code with description
    myResponse.raise_for_status()
