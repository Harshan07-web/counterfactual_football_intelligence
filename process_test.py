import json

with open("data/raw/three_sixty/3857254.json","r",encoding='utf-8') as f:

    data = json.load(f)

for event in range(1):
    frames = data[event]["freeze_frame"]
    teammates = []
    opponents = []
    for frame in frames:
        if frame["actor"]:
            actor_loc = f"{frame["location"][0]},{frame["location"][1]}"

        if frame["teammate"]:
            pos = []
            pos.append(frame["location"][0])
            pos.append(frame["location"][1])

            teammates.append(pos)

        elif not frame["teammate"]:

            pos = []
            pos.append(frame["location"][0])
            pos.append(frame["location"][1])

            opponents.append(pos)

print(f"actor : {actor_loc}")
print("teammates:\n")
for i in teammates:
    print(i)
print("\nopponents:\n")
for i in opponents:
    print(i)

        

