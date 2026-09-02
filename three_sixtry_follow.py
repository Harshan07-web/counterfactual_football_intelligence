import requests
import json


url = "https://raw.githubusercontent.com/hudl/open-data/refs/heads/master/data/three-sixty/3857276.json"

response = requests.request("GET",url=url)

json.dump(response)

with open("C:\Users\Admin\Documents\New folder\counterfactual_football_intelligence\data") as f1:
    pass