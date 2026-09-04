import json

decision_points_path = "data/processed/decision_points_3857276.json"

with open(decision_points_path,"r") as f:
    decision_points = json.load(f)

actions = set()

for i in decision_points:
    outcome = i.get("action","")
    if outcome not in actions:
        actions.add(outcome)

print(len(actions))
print(actions)