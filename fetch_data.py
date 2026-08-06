import requests
import json

url = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/43/106.json"

response = requests.request("GET",url=url)

if response.status_code==200:
        matches = response.json()

with open (r"data\raw\matches\fifa_wc_2022.json","w") as f:
    json.dump(matches,f,indent=5)

count = 0
available = 0
not_available = []
for mat in matches:
    count+=1
    match_id = mat["match_id"]

    ts_url = f"https://raw.githubusercontent.com/statsbomb/open-data/master/data/events/{match_id}.json" 
    res = requests.get(ts_url)

    if res.status_code==200:
          available+=1

          with open(rf"data/raw/events/{match_id}.json","w") as f:
               json.dump(res.json(),f,indent=5)

    else:
          not_available.append(match_id)

print(available)
print(not_available)