import json

with open("data/raw/events/3857276.json", "r", encoding="utf-8") as f:
    events = json.load(f)

events.sort(key=lambda x: (x["period"], x["timestamp"]))

with open("data/event_follow/match=3857276.txt","w",encoding='utf-8') as f2:
    for i in events:
        id = i["id"]
        time_stamp = i["timestamp"]
        type_eve = i["type"]["name"]

        f2.write(f"{id}\n{time_stamp}\n{type_eve}\n\n")

