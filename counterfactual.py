import json
import math
import joblib
import pandas as pd

from pathlib import Path


MATCH_ID = 3857276

MODEL_FILE = Path("models/decision_value_model.joblib")
DECISION_FILE = Path(f"data/decision_points_{MATCH_ID}.json")

if not DECISION_FILE.exists():
    DECISION_FILE = Path(
        f"data/processed/decision_points_{MATCH_ID}.json"
    )

if not DECISION_FILE.exists():
    DECISION_FILE = Path(
        f"data/raw/decision_points_{MATCH_ID}.json"
    )

OUTPUT_FILE = Path(
    f"data/processed/counterfactuals_{MATCH_ID}.json"
)


def dist(a, b):
    if not a or not b:
        return None

    return math.sqrt(
        (float(a[0]) - float(b[0])) ** 2 +
        (float(a[1]) - float(b[1])) ** 2
    )


def get_features(model):
    return list(
        model.named_steps[
            "preprocessor"
        ].feature_names_in_
    )


def context_values(decision):
    state = decision.get("state", {})

    ball = state.get(
        "ball_position",
        [None, None]
    )

    actor = state.get(
        "actor_position",
        [None, None]
    )

    return {
        "ball_x": ball[0] if ball else None,
        "ball_y": ball[1] if ball else None,
        "player_x": actor[0] if actor else None,
        "player_y": actor[1] if actor else None,
        "nearest_opponent_distance":
            state.get("nearest_opponent_distance"),
        "opponents_within_5":
            state.get("opponents_within_5"),
        "opponents_within_10":
            state.get("opponents_within_10"),
        "visible_teammates":
            state.get("visible_teammates"),
        "visible_opponents":
            state.get("visible_opponents"),
        "candidate_pass_count":
            state.get("candidate_pass_count"),
        "open_candidate_pass_count":
            state.get("open_candidate_pass_count"),
        "teammate_count":
            state.get("visible_teammates"),
        "opponent_count":
            state.get("visible_opponents"),
        "available_teammates":
            state.get("visible_teammates"),
        "team":
            decision.get("team"),
        "player_team":
            decision.get("team"),
        "player":
            decision.get("player"),
        "action":
            decision.get("action"),
        "type":
            decision.get("action"),
        "play_pattern":
            decision.get("play_pattern"),
        "possession":
            decision.get("possession"),
        "period":
            decision.get("period"),
        "under_pressure":
            decision.get("actual_action", {}).get(
                "under_pressure"
            ),
    }


def build_row(
    decision,
    features,
    action_type,
    target=None,
    candidate=None
):
    values = context_values(decision)

    state = decision.get("state", {})

    actor = state.get(
        "actor_position",
        [None, None]
    )

    actual = decision.get(
        "actual_action",
        {}
    )

    if action_type == "pass":
        if target is None:
            target = actual.get(
                "end_location"
            )

        length = dist(
            actor,
            target
        )

        values.update({
            "action": "pass",
            "type": "pass",
            "pass_length": length,
            "candidate_pass_length": length,
            "forward_delta":
                candidate.get("forward_delta")
                if candidate else None,
            "lane_blocked":
                candidate.get("lane_blocked")
                if candidate else None,
            "nearest_defender_to_lane":
                candidate.get(
                    "nearest_defender_to_lane"
                )
                if candidate else None,
            "pass_height":
                actual.get("pass_height"),
            "pass_type":
                actual.get("pass_type"),
            "under_pressure":
                actual.get(
                    "under_pressure"
                )
        })

    elif action_type == "carry":
        end = target

        values.update({
            "action": "carry",
            "type": "carry",
            "carry_distance":
                dist(actor, end),
            "under_pressure":
                actual.get(
                    "under_pressure"
                )
        })

    else:
        values.update({
            "action": action_type,
            "type": action_type
        })

    return {
        feature: values.get(
            feature,
            None
        )
        for feature in features
    }


def predict_one(
    model,
    decision,
    features,
    action_type,
    target=None,
    candidate=None
):
    row = build_row(
        decision,
        features,
        action_type,
        target,
        candidate
    )

    frame = pd.DataFrame([row])

    return float(
        model.predict(frame)[0]
    )


def analyse_decision(
    model,
    decision,
    features
):
    actual = decision.get(
        "actual_action",
        {}
    )

    actual_type = actual.get(
        "type",
        decision.get("action")
    )

    actual_target = actual.get(
        "end_location"
    )

    actual_prediction = predict_one(
        model,
        decision,
        features,
        actual_type,
        actual_target
    )

    candidates = []

    for candidate in decision.get(
        "candidate_passes",
        []
    ):
        target = candidate.get(
            "position"
        )

        if not target:
            continue

        prediction = predict_one(
            model,
            decision,
            features,
            "pass",
            target,
            candidate
        )

        candidates.append({
            "candidate_id":
                candidate.get("candidate_id"),
            "target_location":
                target,
            "distance":
                candidate.get("distance"),
            "forward_delta":
                candidate.get("forward_delta"),
            "lane_blocked":
                candidate.get("lane_blocked"),
            "nearest_defender_to_lane":
                candidate.get(
                    "nearest_defender_to_lane"
                ),
            "predicted_value":
                round(prediction, 2)
        })

    candidates.sort(
        key=lambda x: x["predicted_value"],
        reverse=True
    )

    best = candidates[0] if candidates else None

    gap = None

    if best:
        gap = round(
            best["predicted_value"]
            - actual_prediction,
            2
        )

    return {
        "event_id":
            decision.get("event_id"),
        "timestamp":
            decision.get("timestamp"),
        "period":
            decision.get("period"),
        "possession":
            decision.get("possession"),
        "team":
            decision.get("team"),
        "player":
            decision.get("player"),
        "actual_action": actual,
        "actual_predicted_value":
            round(actual_prediction, 2),
        "best_alternative":
            best,
        "decision_gap":
            gap,
        "ranked_candidates":
            candidates
    }


def main():

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_FILE}"
        )

    if not DECISION_FILE.exists():
        raise FileNotFoundError(
            "Decision point JSON not found. "
            "Expected decision_points_3857276.json "
            "in data/, data/processed/ or data/raw/."
        )

    model = joblib.load(
        MODEL_FILE
    )

    features = get_features(
        model
    )

    with open(
        DECISION_FILE,
        "r",
        encoding="utf-8"
    ) as f:
        decisions = json.load(f)

    results = []

    for decision in decisions:

        try:
            result = analyse_decision(
                model,
                decision,
                features
            )

            results.append(result)

        except Exception as error:
            results.append({
                "event_id":
                    decision.get("event_id"),
                "error":
                    str(error)
            })

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            results,
            f,
            indent=2,
            ensure_ascii=False
        )

    valid = [
        r for r in results
        if "error" not in r
    ]

    with_candidates = [
        r for r in valid
        if r.get("ranked_candidates")
    ]

    print()
    print("Counterfactual analysis created")
    print(
        f"Decision points analyzed: {len(valid)}"
    )
    print(
        f"Decision points with candidates: "
        f"{len(with_candidates)}"
    )
    print(
        f"Model input features: {len(features)}"
    )
    print(
        f"Output: {OUTPUT_FILE}"
    )

    if valid:
        sample = next(
            (
                r for r in valid
                if r.get("ranked_candidates")
            ),
            valid[0]
        )

        print()
        print("Sample decision")
        print("=" * 50)
        print(
            f"Player: {sample.get('player')}"
        )
        print(
            f"Actual: "
            f"{sample.get('actual_action', {}).get('type')}"
        )
        print(
            f"Actual predicted value: "
            f"{sample.get('actual_predicted_value')}"
        )

        best = sample.get(
            "best_alternative"
        )

        if best:
            print(
                f"Best candidate: "
                f"{best.get('candidate_id')}"
            )
            print(
                f"Best predicted value: "
                f"{best.get('predicted_value')}"
            )
            print(
                f"Decision gap: "
                f"{sample.get('decision_gap')}"
            )


if __name__ == "__main__":
    main()
