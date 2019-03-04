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

    pullrequest_repo_name = ""
    pullrequest_branch_name = ""
    pr_match = re.search(r"([^\s]+):([^\s]+)", jData['base']['label'])
    if pr_match is not None :
        pullrequest_repo_name = pr_match.group(1).lower()
        pullrequest_branch_name = pr_match.group(2)
    pullrequest_commit_hash = jData['base']['sha']
    backend_branch_name = ""
    backend_repo_name = ""
    pr_match = re.search(r"BACKEND_BRANCH=([^\s]+):([^\s]+)", jData['body'])
    if pr_match is not None :
        backend_repo_name = pr_match.group(1).lower()
        backend_branch_name = pr_match.group(2)
    print("pullrequest_repo_name="+pullrequest_repo_name +
      "\npullrequest_branch_name="+pullrequest_branch_name +
      "\npullrequest_commit_hash="+pullrequest_commit_hash +
      "\nbackend_repo_name="+backend_repo_name +
      "\nbackend_branch_name="+backend_branch_name)

else:
  # If response code is not ok (200), print the resulting http error code with description
    myResponse.raise_for_status()