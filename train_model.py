import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor


MATCH_ID = 3857276

INPUT_FILE = Path(
    f"data/dataset/football_decisions_ml_{MATCH_ID}.csv"
)

MODEL_DIR = Path("models")

MODEL_FILE = MODEL_DIR / "decision_value_model.joblib"


def main():

    if not INPUT_FILE.exists():
        print(f"Dataset not found: {INPUT_FILE}")
        return

    df = pd.read_csv(INPUT_FILE)

    target = "decision_value"

    outcome_columns = [
        "completed",
        "possession_retained",
        "progression",
        "entered_final_third",
        "led_to_shot",
        "led_to_goal",
        "events_after_decision"
    ]

    drop_columns = [
        target,
        "decision_quality",
        "event_id",
        "player",
        "actual_recipient",
        "next_event_type"
    ] + outcome_columns

    X = df.drop(
        columns=drop_columns,
        errors="ignore"
    )

    y = df[target]

    categorical_features = X.select_dtypes(
        include=["object", "string"]
    ).columns.tolist()

    numerical_features = [
        column
        for column in X.columns
        if column not in categorical_features
    ]

    numerical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median")
            )
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(
                    strategy="most_frequent"
                )
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore"
                )
            )
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numerical",
                numerical_pipeline,
                numerical_features
            ),
            (
                "categorical",
                categorical_pipeline,
                categorical_features
            )
        ]
    )

    model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),
            (
                "model",
                model
            )
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    print()
    print("Training leakage-free model...")
    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    print(f"Features used: {len(X.columns)}")
    print()

    pipeline.fit(
        X_train,
        y_train
    )

    predictions = pipeline.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = mean_squared_error(
        y_test,
        predictions
    ) ** 0.5

    r2 = r2_score(
        y_test,
        predictions
    )

    print("MODEL RESULTS")
    print("=" * 40)
    print(f"MAE  : {mae:.3f}")
    print(f"RMSE : {rmse:.3f}")
    print(f"R²   : {r2:.3f}")
    print("=" * 40)

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        pipeline,
        MODEL_FILE
    )

    print()
    print("Model saved successfully:")
    print(MODEL_FILE)


if __name__ == "__main__":
    main()
