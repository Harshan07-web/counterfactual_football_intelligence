import json
import math
from pathlib import Path
import pandas as pd

MATCH_ID = "3857276"
DECISIONS_FILE = Path("data/processed/decision_points_3857276.json")
SEQUENCES_FILE = Path("data/processed/football_sequences_3857276_clean.json")
OUT_JSON = Path("data/processed/action_candidates_3857276.json")
OUT_CSV = Path("data/processed/action_candidates_3857276.csv")

# StatsBomb pitch
PITCH_LENGTH = 120.0
PITCH_WIDTH = 80.0
GOAL_Y = 40.0
GOAL_X_RIGHT = 120.0
GOAL_X_LEFT = 0.0

ACTION_TYPES = ["pass", "carry", "dribble", "shot", "clearance", "duel"]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def point_segment_distance(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    abx, aby = bx - ax, by - ay
    denom = abx * abx + aby * aby
    if denom == 0:
        return dist(p, a)
    t = ((px - ax) * abx + (py - ay) * aby) / denom
    t = clamp(t, 0.0, 1.0)
    q = (ax + t * abx, ay + t * aby)
    return dist(p, q)


def nearest_defender_to_lane(start, end, opponents):
    if not opponents:
        return 99.0, False
    distances = [point_segment_distance(o, start, end) for o in opponents]
    nearest = min(distances)
    return nearest, nearest < 2.5


def forward_delta(start, end, attack_direction):
    # StatsBomb x increases toward the right side. attack_direction is +/-1.
    return (end[0] - start[0]) * (attack_direction or 1)


def goal_x(attack_direction):
    return GOAL_X_RIGHT if attack_direction >= 0 else GOAL_X_LEFT


def angle_to_goal(p, attack_direction):
    gx = goal_x(attack_direction)
    # Use goal centre as a stable approximation.
    return abs(math.degrees(math.atan2(GOAL_Y - p[1], gx - p[0])))


def nearest_opponent(target, opponents):
    if not opponents:
        return 99.0
    return min(dist(target, o) for o in opponents)


def common_candidate(start, target, attack_direction, opponents):
    d = dist(start, target)
    fd = forward_delta(start, target, attack_direction)
    nd, blocked = nearest_defender_to_lane(start, target, opponents)
    return {
        "target_location": [round(target[0], 4), round(target[1], 4)],
        "action_distance": round(d, 4),
        "action_forward_delta": round(fd, 4),
        "nearest_defender_to_lane": round(nd, 4),
        "nearest_opponent_to_target": round(nearest_opponent(target, opponents), 4),
        "lane_blocked": bool(blocked),
    }


def pass_candidates(dp, opponents):
    out = []
    for c in dp.get("candidate_passes", []):
        target = c.get("position")
        if not target:
            continue
        row = common_candidate(dp["state"]["actor_position"], target, dp.get("attack_direction", 1), opponents)
        row.update({
            "action_type": "pass",
            "candidate_source": "360_teammate",
            "candidate_id": f"pass_{c.get('candidate_id', len(out))}",
            "lane_blocked": bool(c.get("lane_blocked", row["lane_blocked"])),
            "nearest_defender_to_lane": float(c.get("nearest_defender_to_lane") if c.get("nearest_defender_to_lane") is not None else row["nearest_defender_to_lane"]),
        })
        out.append(row)
    return out


def directional_targets(start, attack_direction, distances, lateral):
    # lateral is a multiplier for y movement: -1 left, 0 central, +1 right.
    targets = []
    for d in distances:
        for lat in lateral:
            # Keep lateral displacement conservative so candidates remain plausible.
            y = start[1] + lat * min(8.0, d * 0.45)
            x = start[0] + attack_direction * d
            targets.append([clamp(x, 0.5, 119.5), clamp(y, 0.5, 79.5)])
    return targets


def carry_candidates(dp, opponents):
    start = dp["state"]["actor_position"]
    direction = dp.get("attack_direction", 1) or 1
    targets = directional_targets(start, direction, [5, 10, 15], [-1, 0, 1])
    out = []
    for i, target in enumerate(targets):
        row = common_candidate(start, target, direction, opponents)
        row.update({"action_type": "carry", "candidate_source": "synthetic_direction", "candidate_id": f"carry_{i}"})
        # A carry is only plausible when it makes some forward progress.
        if row["action_forward_delta"] >= 3 and not (row["nearest_opponent_to_target"] < 1.0):
            out.append(row)
    return out


def dribble_candidates(dp, opponents):
    start = dp["state"]["actor_position"]
    direction = dp.get("attack_direction", 1) or 1
    targets = directional_targets(start, direction, [3, 6, 9], [-1, 0, 1])
    out = []
    for i, target in enumerate(targets):
        row = common_candidate(start, target, direction, opponents)
        row.update({"action_type": "dribble", "candidate_source": "synthetic_direction", "candidate_id": f"dribble_{i}"})
        # Dribble is most meaningful when an opponent is close enough to challenge.
        if (dp["state"].get("nearest_opponent_distance") is not None and dp["state"].get("nearest_opponent_distance") <= 10):
            out.append(row)
    return out


def shot_candidates(dp, opponents):
    start = dp["state"]["actor_position"]
    direction = dp.get("attack_direction", 1) or 1
    gx = goal_x(direction)
    goal_targets = [
        [gx, 32], [gx, 36], [gx, 40], [gx, 44], [gx, 48]
    ]
    # Only generate shots from a reasonably attackable zone.
    shot_dist = dist(start, [gx, GOAL_Y])
    if shot_dist > 35:
        return []
    out = []
    for i, target in enumerate(goal_targets):
        row = common_candidate(start, target, direction, opponents)
        row.update({
            "action_type": "shot",
            "candidate_source": "goal_target",
            "candidate_id": f"shot_{i}",
            "shot_distance": round(shot_dist, 4),
            "shot_angle_to_goal": round(angle_to_goal(start, direction), 4),
            "shot_target_y": target[1],
        })
        out.append(row)
    return out


def clearance_candidates(dp, opponents):
    start = dp["state"]["actor_position"]
    direction = dp.get("attack_direction", 1) or 1
    # Clear away from danger: toward own half, central/wide channels.
    own = -direction
    targets = [
        [clamp(start[0] + own * 25, 5, 115), 15],
        [clamp(start[0] + own * 25, 5, 115), 40],
        [clamp(start[0] + own * 25, 5, 115), 65],
        [clamp(start[0] + own * 15, 5, 115), 75],
    ]
    out = []
    for i, target in enumerate(targets):
        row = common_candidate(start, target, direction, opponents)
        row.update({"action_type": "clearance", "candidate_source": "safety_zone", "candidate_id": f"clearance_{i}"})
        out.append(row)
    return out


def duel_candidates(dp):
    # Duel is not naturally a target-location action. Represent feasible duel modes
    # as candidate subtypes so the value model can learn action-specific outcomes.
    actual = dp.get("actual_action", {}) or {}
    actual_aerial = bool(actual.get("aerial", False))
    actual_ground = bool(actual.get("ground", False))
    # Always provide both modes when the source event is a duel.
    return [
        {
            "action_type": "duel",
            "candidate_source": "duel_mode",
            "candidate_id": "duel_ground",
            "duel_is_aerial": False,
            "duel_is_ground": True,
            "target_location": None,
            "action_distance": 0.0,
            "action_forward_delta": 0.0,
            "nearest_defender_to_lane": 0.0,
            "nearest_opponent_to_target": 0.0,
            "lane_blocked": False,
        },
        {
            "action_type": "duel",
            "candidate_source": "duel_mode",
            "candidate_id": "duel_aerial",
            "duel_is_aerial": True,
            "duel_is_ground": False,
            "target_location": None,
            "action_distance": 0.0,
            "action_forward_delta": 0.0,
            "nearest_defender_to_lane": 0.0,
            "nearest_opponent_to_target": 0.0,
            "lane_blocked": False,
        },
    ]


def get_opponents(dp):
    # decision_points only stores compact state, so recover opponent coordinates from
    # the corresponding sequence action's context.
    return dp.pop("_opponents", [])


def main():
    DECISIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    decisions = json.loads(DECISIONS_FILE.read_text(encoding="utf-8"))
    sequences = json.loads(SEQUENCES_FILE.read_text(encoding="utf-8"))

    action_map = {}
    for possession in sequences:
        for action in possession.get("actions", []):
            action_map[action.get("event_id")] = action

    all_rows = []
    summary = {}

    for idx, dp0 in enumerate(decisions):
        dp = dict(dp0)
        event = action_map.get(dp.get("event_id"), {})
        context = event.get("context", {}) or {}
        opponents = [x.get("position") for x in context.get("opponents", []) if x.get("position")]
        state = dp.get("state", {}) or {}
        start = state.get("actor_position") or state.get("ball_position")
        if not start:
            continue

        attack_direction = event.get("attack_direction", 1) or 1
        dp["attack_direction"] = attack_direction
        actual_type = str(dp.get("action", "")).lower()

        candidates = []
        candidates += pass_candidates(dp, opponents)
        candidates += carry_candidates(dp, opponents)
        candidates += dribble_candidates(dp, opponents)
        candidates += shot_candidates(dp, opponents)
        candidates += clearance_candidates(dp, opponents)
        
        if (state.get("nearest_opponent_distance") is not None and state.get("nearest_opponent_distance") <= 5):
            candidates += duel_candidates(dp)

        # Always retain the observed action as an explicit candidate. This is critical
        # for comparing actual vs alternatives without inventing an observed target.
        actual = dp.get("actual_action", {}) or {}
        actual_candidate = {
            "action_type": actual_type,
            "candidate_source": "observed_actual",
            "candidate_id": "actual",
            "target_location": actual.get("end_location"),
            "action_distance": actual.get("pass_length", actual.get("carry_distance", 0.0)) or 0.0,
            "action_forward_delta": None,
            "nearest_defender_to_lane": None,
            "nearest_opponent_to_target": None,
            "lane_blocked": False,
            "is_actual": True,
        }
        if actual.get("end_location") and start:
            actual_candidate["action_distance"] = dist(start, actual["end_location"])
            actual_candidate["action_forward_delta"] = forward_delta(start, actual["end_location"], attack_direction)
            nd, blocked = nearest_defender_to_lane(start, actual["end_location"], opponents)
            actual_candidate["nearest_defender_to_lane"] = nd
            actual_candidate["nearest_opponent_to_target"] = nearest_opponent(actual["end_location"], opponents)
            actual_candidate["lane_blocked"] = blocked
        if actual_type == "shot":
            actual_candidate["shot_distance"] = actual.get("shot_distance", dist(start, [goal_x(attack_direction), GOAL_Y]))
            actual_candidate["shot_angle_to_goal"] = actual.get("shot_angle_to_goal", angle_to_goal(start, attack_direction))
        if actual_type == "duel":
            actual_candidate["duel_is_aerial"] = bool(actual.get("aerial", False))
            actual_candidate["duel_is_ground"] = bool(actual.get("ground", False))
        # Replace generated copy of the observed action with the actual candidate only
        # when its candidate id is the same conceptually; keep generated alternatives.
        candidates.append(actual_candidate)

        for c in candidates:
            row = {
                "match_id": MATCH_ID,
                "decision_id": dp.get("event_id"),
                "possession": dp.get("possession"),
                "period": dp.get("period"),
                "timestamp": dp.get("timestamp"),
                "player": dp.get("player"),
                "team": dp.get("team"),
                "actual_action_type": actual_type,
                "candidate_action_type": c.get("action_type"),
                "candidate_id": c.get("candidate_id"),
                "candidate_source": c.get("candidate_source"),
                "is_actual": bool(c.get("is_actual", False)),
                "x": start[0],
                "y": start[1],
                "distance_to_goal": state.get("distance_to_goal"),
                "nearest_opponent_distance": state.get("nearest_opponent_distance"),
                "opponents_within_5": state.get("opponents_within_5"),
                "opponents_within_10": state.get("opponents_within_10"),
                "visible_teammates": state.get("visible_teammates"),
                "visible_opponents": state.get("visible_opponents"),
                "candidate_pass_count": state.get("candidate_pass_count"),
                "open_candidate_pass_count": state.get("open_candidate_pass_count"),
                "under_pressure": event.get("under_pressure", False),
                "attack_direction": attack_direction,
                **c,
            }
            all_rows.append(row)

        summary[actual_type] = summary.get(actual_type, 0) + 1

    OUT_JSON.write_text(json.dumps(all_rows, indent=2), encoding="utf-8")
    pd.DataFrame(all_rows).to_csv(OUT_CSV, index=False)

    print("=" * 70)
    print("MULTI-ACTION CANDIDATE GENERATOR")
    print("=" * 70)
    print(f"Decision points: {len(decisions)}")
    print(f"Candidate rows:  {len(all_rows)}")
    print("Actual action distribution:")
    print(pd.Series(summary).sort_index().to_string())
    print("\nCandidate action distribution:")
    print(pd.Series([r["candidate_action_type"] for r in all_rows]).value_counts().to_string())
    print(f"\nSaved JSON: {OUT_JSON}")
    print(f"Saved CSV:  {OUT_CSV}")


if __name__ == "__main__":
    main()
