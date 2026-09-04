import json
import math
from pathlib import Path

MATCH_ID = "3857276"

EVENT_FILE = Path(f"data/raw/events/{MATCH_ID}.json")
THREE_SIXTY_FILE = Path(f"data/raw/three_sixty/{MATCH_ID}.json")

OUTPUT_DIR = Path("data/processed")
SEQUENCE_FILE = OUTPUT_DIR / f"football_sequences_{MATCH_ID}_clean.json"
DECISION_FILE = OUTPUT_DIR / f"decision_points_{MATCH_ID}.json"
STORY_FILE = OUTPUT_DIR / f"football_story_{MATCH_ID}_clean.txt"

IGNORED_EVENTS = {
    "Starting XI",
    "Half Start",
    "Half End",
    "Tactical Shift",
    "Substitution",
    "Official",
    "Bad Behaviour",
    "Injury Stoppage",
    "Referee Ball-Drop",
    "Shield",
}

DECISION_ACTIONS = {
    "pass",
    "carry",
    "shot",
    "dribble",
    "duel",
    "clearance",
    "cross",
}

CONTEXT_ACTIONS = {
    "pressure",
    "ball recovery",
    "interception",
    "block",
    "miscontrol",
}

CANDIDATE_MAX_DISTANCE = 35.0
PASS_LANE_RADIUS = 2.5
MIN_PASS_LENGTH = 3.0


def distance(a, b):
    if not a or not b:
        return None
    return math.hypot(a[0] - b[0], a[1] - b[1])


def point_to_segment_distance(point, start, end):
    if not point or not start or not end:
        return None

    dx = end[0] - start[0]
    dy = end[1] - start[1]

    if dx == 0 and dy == 0:
        return distance(point, start)

    t = (
        (point[0] - start[0]) * dx
        + (point[1] - start[1]) * dy
    ) / (dx * dx + dy * dy)

    t = max(0.0, min(1.0, t))

    projection = [
        start[0] + t * dx,
        start[1] + t * dy,
    ]

    return distance(point, projection)


def player_name(event):
    return event.get("player", {}).get("name", "Unknown player")


def team_name(event):
    return event.get("team", {}).get("name", "Unknown team")


def event_type(event):
    return event.get("type", {}).get("name", "Unknown")


def event_location(event):
    return event.get("location")


def infer_attack_direction(events):
    directions = {}

    teams = {
        team_name(event)
        for event in events
        if team_name(event) != "Unknown team"
    }

    for team in teams:
        for period in (1, 2):
            shots = [
                event
                for event in events
                if event.get("period") == period
                and team_name(event) == team
                and event_type(event) == "Shot"
                and event.get("location")
            ]

            if shots:
                mean_x = sum(
                    event["location"][0]
                    for event in shots
                ) / len(shots)

                directions[(team, period)] = (
                    1 if mean_x >= 60 else -1
                )

    for team in teams:
        if (team, 1) not in directions:
            directions[(team, 1)] = 1

        if (team, 2) not in directions:
            directions[(team, 2)] = -directions[(team, 1)]

    return directions


def normalize_forward(actor, target, direction):
    if not actor or not target:
        return None

    return round(
        (target[0] - actor[0]) * direction,
        4
    )


def get_frame_map(three_sixty):
    return {
        frame.get("event_uuid"): frame
        for frame in three_sixty
        if frame.get("event_uuid")
    }


def parse_frame(frame):
    if not frame:
        return None

    teammates = []
    opponents = []
    actor = None

    for player in frame.get("freeze_frame", []):
        position = player.get("location")

        if not position or len(position) < 2:
            continue

        point = {
            "position": [
                float(position[0]),
                float(position[1]),
            ],
            "keeper": bool(player.get("keeper", False)),
        }

        if player.get("actor"):
            actor = point

        if player.get("teammate"):
            teammates.append(point)
        else:
            opponents.append(point)

    return {
        "actor": actor,
        "teammates": teammates,
        "opponents": opponents,
        "visible_area": frame.get("visible_area"),
    }


def build_candidates(actor_position, teammates, opponents, direction):
    if not actor_position:
        return []

    candidates = []

    for index, teammate in enumerate(teammates):
        target = teammate["position"]
        target_distance = distance(actor_position, target)

        if target_distance is None:
            continue

        if target_distance < MIN_PASS_LENGTH:
            continue

        if target_distance > CANDIDATE_MAX_DISTANCE:
            continue

        blocked = False
        closest_defender_to_lane = None

        for opponent in opponents:
            defender_distance = point_to_segment_distance(
                opponent["position"],
                actor_position,
                target,
            )

            if (
                closest_defender_to_lane is None
                or defender_distance < closest_defender_to_lane
            ):
                closest_defender_to_lane = defender_distance

            if defender_distance <= PASS_LANE_RADIUS:
                blocked = True

        forward_delta = normalize_forward(
            actor_position,
            target,
            direction,
        )

        candidates.append({
            "candidate_id": index,
            "position": target,
            "distance": round(target_distance, 4),
            "forward_delta": forward_delta,
            "lane_blocked": blocked,
            "nearest_defender_to_lane": (
                round(closest_defender_to_lane, 4)
                if closest_defender_to_lane is not None
                else None
            ),
        })

    candidates.sort(
        key=lambda x: x["distance"]
    )

    for index, candidate in enumerate(candidates):
        candidate["candidate_id"] = index

    return candidates


def spatial_context(event, frame, attack_direction):
    event_position = event_location(event)
    parsed = parse_frame(frame)

    if not parsed:
        return None

    actor = parsed["actor"]

    if actor is None and event_position:
        actor = {
            "position": event_position,
            "keeper": False,
        }

    actor_position = (
        actor["position"]
        if actor
        else event_position
    )

    teammates = parsed["teammates"]
    opponents = parsed["opponents"]

    for teammate in teammates:
        teammate["distance"] = round(
            distance(actor_position, teammate["position"]),
            4
        ) if actor_position else None

        teammate["forward_delta"] = normalize_forward(
            actor_position,
            teammate["position"],
            attack_direction,
        )

    for opponent in opponents:
        opponent["distance"] = round(
            distance(actor_position, opponent["position"]),
            4
        ) if actor_position else None

    opponent_distances = [
        opponent["distance"]
        for opponent in opponents
        if opponent["distance"] is not None
    ]

    nearest_opponent = (
        min(opponent_distances)
        if opponent_distances
        else None
    )

    candidates = build_candidates(
        actor_position,
        teammates,
        opponents,
        attack_direction,
    )

    return {
        "ball": {
            "position": event_position,
        },
        "actor": actor,
        "teammates": teammates,
        "opponents": opponents,
        "spatial_features": {
            "visible_teammates": len(teammates),
            "visible_opponents": len(opponents),
            "nearest_opponent_distance": (
                round(nearest_opponent, 4)
                if nearest_opponent is not None
                else None
            ),
            "opponents_within_5": sum(
                1
                for d in opponent_distances
                if d <= 5
            ),
            "opponents_within_10": sum(
                1
                for d in opponent_distances
                if d <= 10
            ),
            "candidate_pass_count": len(candidates),
            "open_candidate_pass_count": sum(
                1
                for candidate in candidates
                if not candidate["lane_blocked"]
            ),
        },
        "candidate_passes": candidates,
        "visible_area": parsed["visible_area"],
    }


def build_action(event, frame_map, attack_directions):
    e_type = event_type(event)
    action_name = e_type.lower()

    action = {
        "event_id": event.get("id"),
        "timestamp": event.get("timestamp"),
        "period": event.get("period"),
        "minute": event.get("minute"),
        "second": event.get("second"),
        "type": e_type,
        "action": action_name,
        "player": player_name(event),
        "team": team_name(event),
        "location": event_location(event),
        "under_pressure": bool(event.get("under_pressure", False)),
    }

    if e_type == "Pass":
        pass_data = event.get("pass", {})

        action["action"] = "pass"
        action["recipient"] = (
            pass_data.get("recipient", {}).get("name")
        )
        action["end_location"] = pass_data.get("end_location")
        action["outcome"] = (
            pass_data.get("outcome", {}).get("name")
            or "Complete"
        )
        action["pass_length"] = distance(
            event_location(event),
            pass_data.get("end_location"),
        )
        action["pass_height"] = (
            pass_data.get("height", {}).get("name")
        )
        action["pass_type"] = (
            pass_data.get("type", {}).get("name")
        )
        action["cross"] = bool(pass_data.get("cross", False))
        action["cut_back"] = bool(pass_data.get("cut_back", False))

    elif e_type == "Ball Receipt*":
        receipt = event.get("ball_receipt", {})
        action["action"] = "receive"
        action["outcome"] = (
            receipt.get("outcome", {}).get("name")
        )

    elif e_type == "Carry":
        carry_data = event.get("carry", {})
        action["action"] = "carry"
        action["end_location"] = carry_data.get("end_location")
        action["carry_distance"] = distance(
            event_location(event),
            carry_data.get("end_location"),
        )

    elif e_type == "Pressure":
        action["action"] = "pressure"

    elif e_type == "Shot":
        shot_data = event.get("shot", {})
        action["action"] = "shot"
        action["outcome"] = (
            shot_data.get("outcome", {}).get("name")
        )
        action["xg"] = shot_data.get("statsbomb_xg")
        action["shot_body_part"] = (
            shot_data.get("body_part", {}).get("name")
        )
        action["shot_technique"] = (
            shot_data.get("technique", {}).get("name")
        )

    elif e_type == "Duel":
        duel_data = event.get("duel", {})
        action["action"] = "duel"
        action["duel_type"] = (
            duel_data.get("type", {}).get("name")
        )
        action["outcome"] = (
            duel_data.get("outcome", {}).get("name")
        )

    elif e_type == "Clearance":
        clearance = event.get("clearance", {})
        action["action"] = "clearance"
        action["body_part"] = (
            clearance.get("body_part", {}).get("name")
        )

    frame = frame_map.get(event.get("id"))

    direction = attack_directions.get(
        (
            team_name(event),
            event.get("period"),
        ),
        1,
    )

    action["attack_direction"] = direction

    context = spatial_context(
        event,
        frame,
        direction,
    )

    if context:
        action["context"] = context

    return action


def attach_sequence_links(actions):
    for index, action in enumerate(actions):
        action["sequence_index"] = index

        previous = actions[index - 1] if index > 0 else None
        following = (
            actions[index + 1]
            if index + 1 < len(actions)
            else None
        )

        action["previous_action"] = (
            previous["action"]
            if previous
            else None
        )

        action["next_action"] = (
            following["action"]
            if following
            else None
        )


def build_decision_point(action, sequence_history):
    if action["action"] not in DECISION_ACTIONS:
        return None

    context = action.get("context")

    if not context:
        return None

    decision = {
        "event_id": action["event_id"],
        "possession": action["possession"],
        "sequence_index": action["sequence_index"],
        "timestamp": action["timestamp"],
        "period": action["period"],
        "team": action["team"],
        "player": action["player"],
        "action": action["action"],
        "state": {
            "ball_position": (
                context["ball"]["position"]
            ),
            "actor_position": (
                context["actor"]["position"]
                if context.get("actor")
                else None
            ),
            "nearest_opponent_distance": (
                context["spatial_features"][
                    "nearest_opponent_distance"
                ]
            ),
            "opponents_within_5": (
                context["spatial_features"][
                    "opponents_within_5"
                ]
            ),
            "opponents_within_10": (
                context["spatial_features"][
                    "opponents_within_10"
                ]
            ),
            "visible_teammates": (
                context["spatial_features"][
                    "visible_teammates"
                ]
            ),
            "visible_opponents": (
                context["spatial_features"][
                    "visible_opponents"
                ]
            ),
            "candidate_pass_count": (
                context["spatial_features"][
                    "candidate_pass_count"
                ]
            ),
            "open_candidate_pass_count": (
                context["spatial_features"][
                    "open_candidate_pass_count"
                ]
            ),
        },
        "sequence_history": sequence_history,
        "actual_action": {},
    }

    if action["action"] == "pass":
        decision["actual_action"] = {
            "type": "pass",
            "recipient": action.get("recipient"),
            "end_location": action.get("end_location"),
            "outcome": action.get("outcome"),
            "pass_length": action.get("pass_length"),
            "under_pressure": action.get("under_pressure"),
        }

    elif action["action"] == "carry":
        decision["actual_action"] = {
            "type": "carry",
            "end_location": action.get("end_location"),
            "carry_distance": action.get("carry_distance"),
            "under_pressure": action.get("under_pressure"),
        }

    elif action["action"] == "shot":
        decision["actual_action"] = {
            "type": "shot",
            "outcome": action.get("outcome"),
            "xg": action.get("xg"),
            "under_pressure": action.get("under_pressure"),
        }

    else:
        decision["actual_action"] = {
            key: value
            for key, value in action.items()
            if key not in {
                "context",
                "sequence_history",
            }
        }

    decision["candidate_passes"] = context["candidate_passes"]

    return decision


def main():
    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    with EVENT_FILE.open(
        "r",
        encoding="utf-8",
    ) as f:
        events = json.load(f)

    with THREE_SIXTY_FILE.open(
        "r",
        encoding="utf-8",
    ) as f:
        three_sixty = json.load(f)

    events.sort(
        key=lambda event: (
            event.get("period", 0),
            event.get("timestamp", ""),
            event.get("index", 0),
        )
    )

    frame_map = get_frame_map(three_sixty)
    attack_directions = infer_attack_direction(events)

    possessions = {}

    for event in events:
        possession_id = event.get("possession")

        if possession_id is None:
            continue

        e_type = event_type(event)

        if e_type in IGNORED_EVENTS:
            continue

        possession_team = (
            event.get("possession_team", {}).get("name")
            or team_name(event)
        )

        if possession_id not in possessions:
            possessions[possession_id] = {
                "possession": possession_id,
                "team": possession_team,
                "period": event.get("period"),
                "actions": [],
            }

        action = build_action(
            event,
            frame_map,
            attack_directions,
        )

        action["possession"] = possession_id

        possessions[possession_id]["actions"].append(
            action
        )

    football_sequences = []
    decision_points = []

    for possession in possessions.values():
        actions = possession["actions"]

        if not actions:
            continue

        attach_sequence_links(actions)

        for action in actions:
            history_start = max(
                0,
                action["sequence_index"] - 5,
            )

            history = [
                {
                    "action": item["action"],
                    "player": item["player"],
                    "location": item.get("location"),
                    "end_location": item.get("end_location"),
                }
                for item in actions[
                    history_start:action["sequence_index"]
                ]
            ]

            action["sequence_history"] = history

            decision = build_decision_point(
                action,
                history,
            )

            if decision:
                decision_points.append(decision)

        football_sequences.append({
            "match_id": MATCH_ID,
            "possession": possession["possession"],
            "team": possession["team"],
            "period": possession["period"],
            "actions": actions,
        })

    with SEQUENCE_FILE.open(
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            football_sequences,
            f,
            indent=2,
            ensure_ascii=False,
        )

    with DECISION_FILE.open(
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            decision_points,
            f,
            indent=2,
            ensure_ascii=False,
        )

    with STORY_FILE.open(
        "w",
        encoding="utf-8",
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
                start=1,
            ):
                description = (
                    f"{action['player']} "
                    f"{action['action']}"
                )

                if action.get("recipient"):
                    description += (
                        f" to {action['recipient']}"
                    )

                f.write(
                    f"{index}. {description}\n"
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

                if action.get("outcome"):
                    f.write(
                        f"   Outcome: "
                        f"{action['outcome']}\n"
                    )

                context = action.get("context")

                if context:
                    features = context[
                        "spatial_features"
                    ]

                    f.write(
                        "   Spatial: "
                        f"nearest opponent="
                        f"{features['nearest_opponent_distance']}, "
                        f"candidate passes="
                        f"{features['candidate_pass_count']}, "
                        f"open candidates="
                        f"{features['open_candidate_pass_count']}\n"
                    )

                f.write("\n")

    print(
        f"Processed {len(events)} events"
    )
    print(
        f"360 frames: {len(frame_map)}"
    )
    print(
        f"Possessions: {len(football_sequences)}"
    )
    print(
        f"Decision points: {len(decision_points)}"
    )
    print(
        f"Sequences: {SEQUENCE_FILE}"
    )
    print(
        f"Decision dataset: {DECISION_FILE}"
    )
    print(
        f"Debug story: {STORY_FILE}"
    )


if __name__ == "__main__":
    main()
    