import json
import csv
from pathlib import Path


MATCH_ID = 3857276

DECISION_FILE = Path(
    f"data/processed/decision_points_{MATCH_ID}.json"
)

OUTCOME_FILE = Path(
    f"data/processed/decision_points_with_outcomes_{MATCH_ID}.json"
)

OUTPUT_FILE = Path(
    f"data/dataset/football_decisions_{MATCH_ID}.csv"
)


def get_first(data, keys, default=None):
    for key in keys:
        if key in data:
            return data[key]

    return default


def get_nested(data, paths, default=None):
    for path in paths:
        value = data

        try:
            for key in path:
                value = value[key]

            if value is not None:
                return value

        except (KeyError, TypeError, IndexError):
            continue

    return default


def get_position(value):
    if isinstance(value, list) and len(value) >= 2:
        return value[0], value[1]

    return None, None


def count_players(players):
    if isinstance(players, list):
        return len(players)

    return 0


def extract_decision_features(decision):
    state = decision.get("state", {})
    spatial = decision.get("spatial_context", {})

    actor_position = get_nested(
        decision,
        [
            ("actor_position",),
            ("player_position",),
            ("state", "actor_position"),
            ("state", "player_position"),
            ("spatial_context", "actor_position")
        ]
    )

    ball_position = get_nested(
        decision,
        [
            ("ball_position",),
            ("state", "ball_position"),
            ("spatial_context", "ball_position")
        ]
    )

    actor_x, actor_y = get_position(actor_position)
    ball_x, ball_y = get_position(ball_position)

    teammates = get_nested(
        decision,
        [
            ("teammates",),
            ("state", "teammates"),
            ("spatial_context", "teammates")
        ],
        []
    )

    opponents = get_nested(
        decision,
        [
            ("opponents",),
            ("state", "opponents"),
            ("spatial_context", "opponents")
        ],
        []
    )

    candidate_passes = get_nested(
        decision,
        [
            ("candidate_passes",),
            ("state", "candidate_passes"),
            ("spatial_context", "candidate_passes")
        ],
        []
    )

    nearest_opponent_distance = get_nested(
        decision,
        [
            ("nearest_opponent_distance",),
            ("state", "nearest_opponent_distance"),
            ("spatial_context", "nearest_opponent_distance")
        ]
    )

    opponents_within_5 = get_nested(
        decision,
        [
            ("opponents_within_5",),
            ("state", "opponents_within_5"),
            ("spatial_context", "opponents_within_5")
        ]
    )

    opponents_within_10 = get_nested(
        decision,
        [
            ("opponents_within_10",),
            ("state", "opponents_within_10"),
            ("spatial_context", "opponents_within_10")
        ]
    )

    if opponents_within_5 is None:
        opponents_within_5 = 0

        if isinstance(opponents, list):
            for opponent in opponents:
                distance = opponent.get("distance")

                if isinstance(distance, (int, float)) and distance <= 5:
                    opponents_within_5 += 1

    if opponents_within_10 is None:
        opponents_within_10 = 0

        if isinstance(opponents, list):
            for opponent in opponents:
                distance = opponent.get("distance")

                if isinstance(distance, (int, float)) and distance <= 10:
                    opponents_within_10 += 1

    open_candidate_passes = 0
    blocked_candidate_passes = 0

    if isinstance(candidate_passes, list):
        for candidate in candidate_passes:
            if candidate.get("lane_blocked") is True:
                blocked_candidate_passes += 1
            else:
                open_candidate_passes += 1

    actual_action = get_first(
        decision,
        ["actual_action", "action"],
        {}
    )

    if isinstance(actual_action, str):
        action_type = actual_action
        actual_action = {}
    else:
        action_type = get_first(
            actual_action,
            ["type", "action"],
            decision.get("action")
        )

    player = get_first(
        decision,
        ["player", "player_name", "actor"]
    )

    team = get_first(
        decision,
        ["team", "player_team"]
    )

    possession = get_first(
        decision,
        ["possession"]
    )

    under_pressure = get_first(
        decision,
        ["under_pressure"]
    )

    return {
        "event_id": get_first(
            decision,
            ["event_id", "id"]
        ),

        "player": player,
        "team": team,
        "possession": possession,

        "action": action_type,

        "ball_x": ball_x,
        "ball_y": ball_y,

        "player_x": actor_x,
        "player_y": actor_y,

        "nearest_opponent_distance": nearest_opponent_distance,

        "opponents_within_5": opponents_within_5,
        "opponents_within_10": opponents_within_10,

        "teammate_count": count_players(teammates),
        "opponent_count": count_players(opponents),

        "candidate_pass_count": len(candidate_passes)
        if isinstance(candidate_passes, list)
        else 0,

        "open_candidate_pass_count": open_candidate_passes,

        "blocked_candidate_pass_count": blocked_candidate_passes,

        "under_pressure": under_pressure,

        "actual_recipient": get_first(
            actual_action,
            ["recipient"]
        ),

        "pass_length": get_first(
            actual_action,
            ["pass_length"]
        ),

        "pass_height": get_first(
            actual_action,
            ["pass_height"]
        ),

        "pass_type": get_first(
            actual_action,
            ["pass_type"]
        )
    }


def extract_outcome_features(outcome):
    if not isinstance(outcome, dict):
        return {
            "completed": None,
            "possession_retained": None,
            "progression": None,
            "entered_final_third": None,
            "led_to_shot": None,
            "led_to_goal": None,
            "next_event_type": None,
            "events_after_decision": 0
        }

    return {
        "completed": outcome.get("completed"),
        "possession_retained": outcome.get(
            "possession_retained"
        ),
        "progression": outcome.get(
            "progression"
        ),
        "entered_final_third": outcome.get(
            "entered_final_third"
        ),
        "led_to_shot": outcome.get(
            "led_to_shot"
        ),
        "led_to_goal": outcome.get(
            "led_to_goal"
        ),
        "next_event_type": outcome.get(
            "next_event_type"
        ),
        "events_after_decision": outcome.get(
            "events_after_decision",
            0
        )
    }


def main():

    if not DECISION_FILE.exists():
        print(f"Decision file not found: {DECISION_FILE}")
        return

    if not OUTCOME_FILE.exists():
        print(f"Outcome file not found: {OUTCOME_FILE}")
        return

    with open(
        DECISION_FILE,
        "r",
        encoding="utf-8"
    ) as f:
        decisions = json.load(f)

    with open(
        OUTCOME_FILE,
        "r",
        encoding="utf-8"
    ) as f:
        outcomes = json.load(f)

    outcome_by_id = {}

    for outcome_record in outcomes:

        event_id = get_first(
            outcome_record,
            ["event_id", "id"]
        )

        if event_id is not None:
            outcome_by_id[event_id] = outcome_record

    dataset = []

    for decision in decisions:

        event_id = get_first(
            decision,
            ["event_id", "id"]
        )

        outcome_record = outcome_by_id.get(
            event_id,
            {}
        )

        row = {}

        row.update(
            extract_decision_features(decision)
        )

        outcome = outcome_record.get(
            "outcome",
            decision.get("outcome", {})
        )

        row.update(
            extract_outcome_features(outcome)
        )

        dataset.append(row)

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    fieldnames = [
        "event_id",
        "player",
        "team",
        "possession",
        "action",

        "ball_x",
        "ball_y",
        "player_x",
        "player_y",

        "nearest_opponent_distance",
        "opponents_within_5",
        "opponents_within_10",

        "teammate_count",
        "opponent_count",

        "candidate_pass_count",
        "open_candidate_pass_count",
        "blocked_candidate_pass_count",

        "under_pressure",

        "actual_recipient",
        "pass_length",
        "pass_height",
        "pass_type",

        "completed",
        "possession_retained",
        "progression",
        "entered_final_third",
        "led_to_shot",
        "led_to_goal",

        "next_event_type",
        "events_after_decision"
    ]

    with open(
        OUTPUT_FILE,
        "w",
        newline="",
        encoding="utf-8"
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames
        )

        writer.writeheader()

        for row in dataset:
            writer.writerow(row)

    print()
    print("Dataset created successfully")
    print(f"Rows: {len(dataset)}")
    print(f"Columns: {len(fieldnames)}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()