import pandas as pd
from pathlib import Path

MATCH_ID = 3857276

INPUT_FILE = Path(
    f"data/dataset/football_decisions_{MATCH_ID}.csv"
)

OUTPUT_FILE = Path(
    f"data/dataset/football_decisions_ml_{MATCH_ID}.csv"
)


def to_number(value):
    return pd.to_numeric(value, errors="coerce").fillna(0)


def to_bool(value):
    return (
        value.astype(str)
        .str.lower()
        .isin(["true", "1", "yes"])
        .astype(int)
    )


def main():

    if not INPUT_FILE.exists():
        print(f"Input file not found: {INPUT_FILE}")
        return

    df = pd.read_csv(INPUT_FILE)

    progression = to_number(df["progression"]).clip(-30, 30)

    progression_score = ((progression + 30) / 60) * 30

    possession_score = to_bool(
        df["possession_retained"]
    ) * 25

    final_third_score = to_bool(
        df["entered_final_third"]
    ) * 15

    shot_score = to_bool(
        df["led_to_shot"]
    ) * 20

    goal_score = to_bool(
        df["led_to_goal"]
    ) * 30

    df["decision_value"] = (
        progression_score
        + possession_score
        + final_third_score
        + shot_score
        + goal_score
    )

    df["decision_value"] = (
        df["decision_value"]
        .clip(0, 100)
        .round(2)
    )

    df["decision_quality"] = pd.cut(
        df["decision_value"],
        bins=[-1, 30, 60, 80, 100],
        labels=[
            "Poor",
            "Average",
            "Good",
            "Excellent"
        ]
    )

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print()
    print("ML dataset created successfully")
    print(f"Rows: {len(df)}")
    print(f"Columns: {len(df.columns)}")
    print()
    print("Decision value statistics:")
    print(df["decision_value"].describe())
    print()
    print("Decision quality distribution:")
    print(df["decision_quality"].value_counts())
    print()
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
