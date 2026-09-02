import json

with open(
    "data/raw/events/3857276.json",
    "r",
    encoding="utf-8"
) as f:
    events = json.load(f)


events.sort(
    key=lambda x: (
        x.get("period", 0),
        x.get("timestamp", "")
    )
)


events_by_id = {
    event["id"]: event
    for event in events
}


def player_name(event):

    return event.get(
        "player",
        {}
    ).get("name", "Unknown player")


def team_name(event):

    return event.get(
        "team",
        {}
    ).get("name", "Unknown team")


def event_type(event):

    return event.get(
        "type",
        {}
    ).get("name", "Unknown")


def location(event):

    return event.get("location")


possessions = {}

for event in events:

    possession_id = event.get("possession")

    if possession_id is None:
        continue

    if possession_id not in possessions:

        possessions[possession_id] = {
            "possession": possession_id,
            "team": event.get(
                "possession_team",
                {}
            ).get("name"),

            "events": []
        }

    possessions[possession_id]["events"].append(event)


def build_action(event, next_event=None):

    e_type = event_type(event)

    player = player_name(event)

    action = {
        "event_id": event.get("id"),
        "timestamp": event.get("timestamp"),
        "type": e_type,
        "player": player,
        "team": team_name(event),
        "location": location(event)
    }

    if e_type == "Pass":

        pass_data = event.get(
            "pass",
            {}
        )

        recipient = pass_data.get(
            "recipient",
            {}
        ).get("name")

        end_location = pass_data.get(
            "end_location"
        )

        outcome = pass_data.get(
            "outcome",
            {}
        ).get("name")

        action["action"] = "pass"

        action["recipient"] = recipient

        action["end_location"] = end_location

        action["outcome"] = (
            outcome
            if outcome
            else "Complete"
        )

        action["description"] = (
            f"{player} passes to "
            f"{recipient or 'unknown player'}"
        )


    elif e_type == "Ball Receipt*":

        receipt = event.get(
            "ball_receipt",
            {}
        )

        outcome = receipt.get(
            "outcome",
            {}
        ).get("name")

        action["action"] = "receive"

        action["outcome"] = outcome

        action["description"] = (
            f"{player} receives the ball"
        )

    elif e_type == "Carry":

        carry_data = event.get(
            "carry",
            {}
        )

        end_location = carry_data.get(
            "end_location"
        )

        under_pressure = event.get(
            "under_pressure",
            False
        )

        action["action"] = "carry"

        action["end_location"] = end_location

        action["under_pressure"] = under_pressure

        if under_pressure:

            action["description"] = (
                f"{player} carries the ball "
                f"under pressure"
            )

        else:

            action["description"] = (
                f"{player} carries the ball"
            )


    elif e_type == "Pressure":

        action["action"] = "pressure"

        action["description"] = (
            f"{player} applies pressure"
        )


    elif e_type == "Shot":

        shot_data = event.get(
            "shot",
            {}
        )

        outcome = shot_data.get(
            "outcome",
            {}
        ).get("name")

        xg = shot_data.get(
            "statsbomb_xg"
        )

        action["action"] = "shot"

        action["outcome"] = outcome

        action["xg"] = xg

        action["description"] = (
            f"{player} takes a shot"
        )


    elif e_type == "Duel":

        duel_data = event.get(
            "duel",
            {}
        )

        duel_type = duel_data.get(
            "type",
            {}
        ).get("name")

        outcome = duel_data.get(
            "outcome",
            {}
        ).get("name")

        action["action"] = "duel"

        action["duel_type"] = duel_type

        action["outcome"] = outcome

        action["description"] = (
            f"{player} enters a duel"
        )


    elif e_type == "Clearance":

        clearance = event.get(
            "clearance",
            {}
        )

        body_part = clearance.get(
            "body_part",
            {}
        ).get("name")

        action["action"] = "clearance"

        action["body_part"] = body_part

        action["description"] = (
            f"{player} clears the ball"
        )

    else:

        action["action"] = e_type.lower()

        action["description"] = (
            f"{player}: {e_type}"
        )


    return action

football_sequences = []


for possession_id, possession in possessions.items():

    raw_events = possession["events"]

    sequence = {
        "possession": possession_id,
        "team": possession["team"],
        "actions": []
    }


    for index, event in enumerate(raw_events):

        next_event = None

        if index + 1 < len(raw_events):

            next_event = raw_events[index + 1]


        action = build_action(
            event,
            next_event
        )

        sequence["actions"].append(
            action
        )


    football_sequences.append(
        sequence
    )

#chained events

with open(
    "data/processed/football_sequences_3857276.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        football_sequences,
        f,
        indent=4,
        ensure_ascii=False
    )

#debug file for readability

with open(
    "data/processed/football_story_3857276.txt",
    "w",
    encoding="utf-8"
) as f:

    for possession in football_sequences:

        f.write("\n")
        f.write("=" * 70 + "\n")

        f.write(
            f"POSSESSION {possession['possession']}"
            f" | {possession['team']}\n"
        )

        f.write("=" * 70 + "\n\n")


        for index, action in enumerate(
            possession["actions"],
            start=1
        ):

            f.write(
                f"{index}. "
                f"{action['description']}\n"
            )

            if action.get("location"):

                f.write(
                    f"   Location: "
                    f"{action['location']}\n"
                )

            if action.get("end_location"):

                f.write(
                    f"   End: "
                    f"{action['end_location']}\n"
                )

            if action.get("under_pressure"):

                f.write(
                    "   Under pressure: Yes\n"
                )

            if action.get("outcome"):

                f.write(
                    f"   Outcome: "
                    f"{action['outcome']}\n"
                )

            f.write("\n")


        f.write(
            "END POSSESSION\n\n"
        )


print(
    f"Created {len(football_sequences)} "
    "football sequences."
)