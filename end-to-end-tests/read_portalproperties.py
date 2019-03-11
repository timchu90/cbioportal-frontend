#!/usr/bin/python3

import sys
import yaml
import re

filename = sys.argv[1]
with open(filename, 'r') as f:
  for l in f:
    e = l.rstrip().split("=")
    e[0] = e[0].replace(".","_")
    print(e[0].rstrip()+"="+e[1].rstrip()+"\n")