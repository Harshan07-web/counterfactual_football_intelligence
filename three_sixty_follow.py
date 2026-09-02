import requests
import json
import matplotlib.pyplot as plt

with open(
    "data/raw/three_sixty/3857276.json",
    "r",
    encoding="utf-8"
) as f1:
    ts = json.load(f1)

with open(
    "data/raw/events/3857276.json",
    "r"
)as f:
    events = json.load(f)

all_events = []
for event in events:
    all_events.append(event["id"])

event_not_available = 0
for event in all_events:

    for ff in ts:
        if ff["event_uuid"] == event:
            for i in ff["freeze_frame"]:
                if i["teammate"] and i["actor"]:
                    plt.scatter(i["location"][0],i["location"][1],color='yellow',marker='o')
                elif i["teammate"]:
                    plt.scatter(i["location"][0],i["location"][1],color='blue',marker='o')
                else:
                    plt.scatter(i["location"][0],i["location"][1],color='red',marker='o')

                plt.xlim(0, 120)  
                plt.ylim(0, 80)   
                plt.gca().set_aspect('equal', adjustable='box')
                plt.title(f"event {ff['event_uuid']}")
            plt.show()

