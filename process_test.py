import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


MATCH_ID = "3857276"

INPUT_FILE = Path(
    f"data/processed/football_sequences_{MATCH_ID}_clean.json"
)

OUTPUT_DIR = Path("data/dataset")
OUTPUT_FILE = OUTPUT_DIR / f"football_action_ml_{MATCH_ID}.csv"

ACTION_TYPES = {
    "pass",
    "carry",
    "dribble",
    "shot",
    "clearance",
    "duel",
}

# Number of actions after the decision used to calculate its outcome.
OUTCOME_HORIZON = 5


def safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def distance(a, b):
    if not a or not b:
        return 0.0

    return math.hypot(
        safe_float(a[0]) - safe_float(b[0]),
        safe_float(a[1]) - safe_float(b[1]),
    )


def get_position(action):
    """
    Position of the player at the decision moment.
    """

    position = action.get("location")

    if position and len(position) >= 2:
        return [
            safe_float(position[0]),
            safe_float(position[1]),
        ]

    context = action.get("context") or {}
    actor = context.get("actor") or {}

    position = actor.get("position")

    if position and len(position) >= 2:
        return [
            safe_float(position[0]),
            safe_float(position[1]),
        ]

    return None


def get_end_position(action):
    """
    End position of the action, if StatsBomb provides one.
    """

    end = action.get("end_location")

    if end and len(end) >= 2:
        return [
            safe_float(end[0]),
            safe_float(end[1]),
        ]

    return None


def forward_delta(start, end, attack_direction):
    if not start or not end:
        return 0.0

    return (
        safe_float(end[0]) - safe_float(start[0])
    ) * safe_float(attack_direction, 1.0)


def nearest_opponent_distance(action):
    context = action.get("context") or {}
    spatial = context.get("spatial_features") or {}

    return safe_float(
        spatial.get("nearest_opponent_distance"),
        50.0,
    )


def opponents_within(action, key):
    context = action.get("context") or {}
    spatial = context.get("spatial_features") or {}

    return safe_float(
        spatial.get(key),
        0.0,
    )


def visible_count(action, key):
    context = action.get("context") or {}
    spatial = context.get("spatial_features") or {}

    return safe_float(
        spatial.get(key),
        0.0,
    )


# STATE FEATURES
def spatial_features(action):
    start = get_position(action)

    attack_direction = safe_float(
        action.get("attack_direction"),
        1.0,
    )

    x = start[0] if start else 0.0
    y = start[1] if start else 0.0

    # StatsBomb pitch is 120 x 80.
    # This is a simple geometric distance to the attacking goal.
    goal_x = 120.0 if attack_direction == 1 else 0.0

    distance_to_goal = math.hypot(
        goal_x - x,
        40.0 - y,
    )

    return {
        "x": x,
        "y": y,

        "distance_to_goal": distance_to_goal,

        "nearest_opponent_distance":
            nearest_opponent_distance(action),

        "opponents_within_5":
            opponents_within(
                action,
                "opponents_within_5",
            ),

        "opponents_within_10":
            opponents_within(
                action,
                "opponents_within_10",
            ),

        "visible_teammates":
            visible_count(
                action,
                "visible_teammates",
            ),

        "visible_opponents":
            visible_count(
                action,
                "visible_opponents",
            ),

        "candidate_pass_count":
            visible_count(
                action,
                "candidate_pass_count",
            ),

        "open_candidate_pass_count":
            visible_count(
                action,
                "open_candidate_pass_count",
            ),

        "under_pressure": int(
            bool(action.get("under_pressure", False))
        ),

        "attack_direction": attack_direction,
    }


# ACTION FEATURES
def action_features(action):
    action_type = action.get("action")

    start = get_position(action)
    end = get_end_position(action)

    attack_direction = safe_float(
        action.get("attack_direction"),
        1.0,
    )

    action_distance = distance(
        start,
        end,
    )

    action_forward = forward_delta(
        start,
        end,
        attack_direction,
    )

    features = {
        # Generic
        "action_distance": action_distance,
        "action_forward_delta": action_forward,

        # PASS
        "pass_length": 0.0,
        "pass_is_cross": 0,
        "pass_is_cutback": 0,

        # CARRY
        "carry_distance": 0.0,

        # SHOT
        "shot_xg": 0.0,
        "shot_distance": 0.0,
        "shot_angle_to_goal": 0.0,

        # DUEL
        "duel_is_aerial": 0,
        "duel_is_ground": 0,
    }

    # --------------------------------------------------------
    # PASS
    # --------------------------------------------------------

    if action_type == "pass":

        features["pass_length"] = safe_float(
            action.get("pass_length"),
            action_distance,
        )

        features["pass_is_cross"] = int(
            bool(action.get("cross", False))
        )

        features["pass_is_cutback"] = int(
            bool(action.get("cut_back", False))
        )

    # --------------------------------------------------------
    # CARRY
    # --------------------------------------------------------

    elif action_type == "carry":

        features["carry_distance"] = safe_float(
            action.get("carry_distance"),
            action_distance,
        )

    # --------------------------------------------------------
    # SHOT
    # --------------------------------------------------------

    elif action_type == "shot":

        start_x = start[0] if start else 0.0
        start_y = start[1] if start else 40.0

        attack_direction = safe_float(
            action.get("attack_direction"),
            1.0,
        )

        goal_x = (
            120.0
            if attack_direction == 1
            else 0.0
        )

        features["shot_xg"] = safe_float(
            action.get("xg"),
            0.0,
        )

        features["shot_distance"] = math.hypot(
            goal_x - start_x,
            40.0 - start_y,
        )

        dx = max(
            abs(goal_x - start_x),
            0.001,
        )

        dy = abs(
            40.0 - start_y
        )

        features["shot_angle_to_goal"] = math.degrees(
            math.atan2(dy, dx)
        )

    # --------------------------------------------------------
    # DUEL
    # --------------------------------------------------------

    elif action_type == "duel":

        duel_type = str(
            action.get("duel_type") or ""
        ).lower()

        features["duel_is_aerial"] = int(
            "aerial" in duel_type
        )

        features["duel_is_ground"] = int(
            "ground" in duel_type
        )

    return features


# ============================================================
# OUTCOME / TARGET
# ============================================================

def is_goal(action):
    return (
        action.get("action") == "shot"
        and str(
            action.get("outcome") or ""
        ).lower() == "goal"
    )


def is_shot(action):
    return action.get("action") == "shot"


def is_turnover(action):
    """
    Conservative turnover detection.

    We intentionally don't classify every unsuccessful event
    as a turnover.
    """

    action_type = action.get("action")

    outcome = str(
        action.get("outcome") or ""
    ).lower()

    # Failed / incomplete passes.
    if action_type == "pass":

        return outcome not in {
            "",
            "complete",
            "unknown",
        }

    # Duel loss.
    if action_type == "duel":

        return any(
            token in outcome
            for token in [
                "lost",
                "unsuccessful",
            ]
        )

    # Explicit possession-loss events.
    if action_type in {
        "dispossessed",
        "miscontrol",
    }:
        return True

    return False


def observed_outcome(actions, index):
    """
    Calculate what happened AFTER the decision.

    These fields become the training target.

    They are NOT fed into the model as input features.
    """

    current = actions[index]

    future = actions[
        index + 1:
        min(
            len(actions),
            index + 1 + OUTCOME_HORIZON,
        )
    ]

    start = get_position(current)
    end = get_end_position(current)

    attack_direction = safe_float(
        current.get("attack_direction"),
        1.0,
    )

    # --------------------------------------------------------
    # 1. Immediate progression
    # --------------------------------------------------------

    progression = forward_delta(
        start,
        end,
        attack_direction,
    )

    progression_value = np.clip(
        progression / 40.0,
        -1.0,
        1.0,
    )

    # --------------------------------------------------------
    # 2. Future shot threat
    # --------------------------------------------------------

    future_shot_xg = 0.0

    for action in future:

        if is_shot(action):

            future_shot_xg = max(
                future_shot_xg,
                safe_float(
                    action.get("xg"),
                    0.0,
                ),
            )

    # --------------------------------------------------------
    # 3. Goal created
    # --------------------------------------------------------

    goal_created = int(
        any(
            is_goal(action)
            for action in future
        )
    )

    # --------------------------------------------------------
    # 4. Turnover
    # --------------------------------------------------------

    turnover = int(
        any(
            is_turnover(action)
            for action in future
        )
    )

    # --------------------------------------------------------
    # 5. Possession continues
    # --------------------------------------------------------

    possession_continues = int(
        len(future) > 0
    )

    # --------------------------------------------------------
    # Composite target
    # --------------------------------------------------------
    #
    # This is our FIRST target definition.
    #
    # Later we can replace this with:
    # - xT
    # - EPV
    # - learned possession value
    # - a proper probabilistic outcome model
    #
    # The important thing now is that the target is based
    # on consequences rather than future information leaking
    # into the feature set.
    #

    decision_value = (
        0.40 * progression_value
        + 0.30 * future_shot_xg
        + 1.00 * goal_created
        + 0.10 * possession_continues
        - 0.35 * turnover
    )

    return {
        "progression_value":
            float(progression_value),

        "future_shot_xg":
            float(future_shot_xg),

        "goal_created":
            goal_created,

        "turnover":
            turnover,

        "possession_continues":
            possession_continues,

        "decision_value":
            float(decision_value),
    }


# ============================================================
# BUILD DATASET
# ============================================================

def build_rows(data):

    rows = []

    for possession in data:

        actions = possession.get(
            "actions"
        ) or []

        for index, action in enumerate(actions):

            action_type = action.get(
                "action"
            )

            if action_type not in ACTION_TYPES:
                continue

            state = spatial_features(
                action
            )

            action_state = action_features(
                action
            )

            outcome = observed_outcome(
                actions,
                index,
            )

            row = {

                "match_id":
                    MATCH_ID,

                "possession":
                    possession.get(
                        "possession"
                    ),

                "period":
                    action.get(
                        "period"
                    ),

                "timestamp":
                    action.get(
                        "timestamp"
                    ),

                "minute":
                    action.get(
                        "minute"
                    ),

                "second":
                    action.get(
                        "second"
                    ),

                "event_id":
                    action.get(
                        "event_id"
                    ),

                "player":
                    action.get(
                        "player"
                    ),

                "team":
                    action.get(
                        "team"
                    ),

                "action_type":
                    action_type,
            }

            row.update(state)
            row.update(action_state)
            row.update(outcome)

            rows.append(row)

    return rows


def main():

    if not INPUT_FILE.exists():

        raise FileNotFoundError(
            f"Input file not found: {INPUT_FILE}"
        )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    with INPUT_FILE.open(
        "r",
        encoding="utf-8",
    ) as file:

        data = json.load(file)

    rows = build_rows(data)

    df = pd.DataFrame(rows)

    # Remove unusable rows.
    df = df[
        df["event_id"].notna()
        & df["action_type"].notna()
    ].copy()

    action_order = [
        "pass",
        "carry",
        "dribble",
        "shot",
        "clearance",
        "duel",
    ]

    df["action_type"] = pd.Categorical(
        df["action_type"],
        categories=action_order,
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print("=" * 70)
    print("MULTI-ACTION FOOTBALL ML DATASET")
    print("=" * 70)

    print(
        f"Rows: {len(df)}"
    )

    print(
        f"Columns: {len(df.columns)}"
    )

    print()

    print("Action distribution:")

    print(
        df[
            "action_type"
        ].value_counts()
    )

    print()

    print("Target statistics:")

    print(
        df[
            [
                "decision_value",
                "progression_value",
                "future_shot_xg",
                "goal_created",
                "turnover",
            ]
        ].describe()
    )

    print()

    print(
        f"Saved to: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()