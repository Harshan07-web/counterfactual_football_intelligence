import json
from pathlib import Path

MATCH_ID = 3857276

DECISION_FILE = Path(f"data/processed/decision_points_{MATCH_ID}.json")
EVENT_FILE = Path(f"data/raw/events/{MATCH_ID}.json")
OUTPUT_FILE = Path(f"data/processed/decision_points_with_outcomes_{MATCH_ID}.json")

MAX_FOLLOW_EVENTS = 15


def get_event_type(event):
    return event.get("type", {}).get("name")


def get_location(event):
    location = event.get("location")

    if isinstance(location, list) and len(location) >= 2:
        return location[0], location[1]

    return None, None


def get_end_location(event):
    event_type = get_event_type(event)

    if event_type == "Pass":
        location = event.get("pass", {}).get("end_location")
    elif event_type == "Carry":
        location = event.get("carry", {}).get("end_location")
    elif event_type == "Shot":
        location = event.get("shot", {}).get("end_location")
    else:
        location = None

    if isinstance(location, list) and len(location) >= 2:
        return location[0], location[1]

    return get_location(event)


def get_team(event):
    return event.get("team", {}).get("name")


def calculate_progression(start_location, end_location):
    if start_location[0] is None or end_location[0] is None:
        return None

    return round(end_location[0] - start_location[0], 3)


def is_completed_pass(event):
    if get_event_type(event) != "Pass":
        return False

    outcome = event.get("pass", {}).get("outcome")

    if outcome is None:
        return True

    return outcome.get("name") == "Complete"


def same_possession(event, decision_event):
    return (
        event.get("possession") is not None
        and event.get("possession") == decision_event.get("possession")
    )


def calculate_outcome(decision_event, following_events):
    decision_type = get_event_type(decision_event)
    decision_team = get_team(decision_event)

    outcome = {
        "action_type": decision_type,
        "completed": None,
        "possession_retained": False,
        "end_location": None,
        "progression": None,
        "entered_final_third": False,
        "led_to_shot": False,
        "led_to_goal": False,
        "next_event_type": None,
        "events_after_decision": len(following_events)
    }

    start_x, start_y = get_location(decision_event)
    end_x, end_y = get_end_location(decision_event)

    if end_x is not None and end_y is not None:
        outcome["end_location"] = [end_x, end_y]

        if start_x is not None and start_y is not None:
            outcome["progression"] = calculate_progression(
                (start_x, start_y),
                (end_x, end_y)
            )

        if end_x >= 80:
            outcome["entered_final_third"] = True

    if decision_type == "Pass":
        outcome["completed"] = is_completed_pass(decision_event)
    elif decision_type in {"Carry", "Dribble", "Shot"}:
        outcome["completed"] = True

    if following_events:
        outcome["next_event_type"] = get_event_type(following_events[0])

    for event in following_events:
        event_type = get_event_type(event)
        event_team = get_team(event)

        if event_team == decision_team:
            outcome["possession_retained"] = True

        if event_type == "Shot" and event_team == decision_team:
            outcome["led_to_shot"] = True

            shot_outcome = (
                event.get("shot", {})
                .get("outcome", {})
                .get("name")
            )

            if shot_outcome == "Goal":
                outcome["led_to_goal"] = True

            break

    return outcome


def main():
    with open(DECISION_FILE, "r", encoding="utf-8") as f:
        decisions = json.load(f)

    with open(EVENT_FILE, "r", encoding="utf-8") as f:
        events = json.load(f)

    events.sort(
        key=lambda x: (
            x.get("period", 0),
            x.get("timestamp", "")
        )
    )

    events_by_id = {
        event.get("id"): event
        for event in events
        if event.get("id") is not None
    }

    event_index = {
        event.get("id"): index
        for index, event in enumerate(events)
        if event.get("id") is not None
    }

    for decision in decisions:
        decision_event_id = (
            decision.get("event_id")
            or decision.get("id")
            or decision.get("event", {}).get("id")
        )

        decision_event = events_by_id.get(decision_event_id)

        if not decision_event:
            decision["outcome"] = {
                "action_type": decision.get("action"),
                "completed": None,
                "possession_retained": False,
                "end_location": None,
                "progression": None,
                "entered_final_third": False,
                "led_to_shot": False,
                "led_to_goal": False,
                "next_event_type": None,
                "events_after_decision": 0
            }
            continue

        start_index = event_index[decision_event_id]
        following_events = []

        for event in events[start_index + 1:]:
            if len(following_events) >= MAX_FOLLOW_EVENTS:
                break

            if not same_possession(event, decision_event):
                break

            following_events.append(event)

        decision["outcome"] = calculate_outcome(
            decision_event,
            following_events
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(decisions, f, indent=2, ensure_ascii=False)

    print(f"Created: {OUTPUT_FILE}")
    print(f"Decision points processed: {len(decisions)}")


if __name__ == "__main__":
    main()
