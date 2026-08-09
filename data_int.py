import json

with open("data/raw/events/3857254.json", "r") as f1:
    events = json.load(f1)

with open("data/raw/three_sixty/3857254.json", "r") as f2:
    t60 = json.load(f2)


event_count = 0
all_events = {}

total_pass = 0
pass_360 = 0
no_pass_360 = 0


t60_ids = {m["event_uuid"] for m in t60}

for event in events:
    event_id = event["id"]
    event_count += 1

    event_name = event["type"]["name"]

    if event_name in all_events:
        all_events[event_name] += 1
    else:
        all_events[event_name] = 1

    if event_name == "Pass":
        total_pass += 1

        if event_id in t60_ids:
            pass_360 += 1
        else:
            no_pass_360 += 1


print("Total events:", event_count)
print("Total 360:", len(t60))

print("\nEvent types:")
print(all_events)

print("\nPass statistics:")
print("Total passes:", total_pass)
print("Passes with 360:", pass_360)
print("Passes without 360:", no_pass_360)