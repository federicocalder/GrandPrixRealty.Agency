"""
Configuration for model training
"""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class DatabaseConfig:
    url: str


@dataclass
class ModelConfig:
    # Training parameters
    test_size: float = 0.2
    random_state: int = 42

    # LightGBM parameters
    n_estimators: int = 1000
    learning_rate: float = 0.05
    max_depth: int = 8
    num_leaves: int = 63
    min_child_samples: int = 20
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    reg_alpha: float = 0.1
    reg_lambda: float = 0.1

    # Early stopping
    early_stopping_rounds: int = 50

    # Output paths
    model_path: str = "models/avm_model.joblib"
    scaler_path: str = "models/avm_scaler.joblib"
    feature_names_path: str = "models/feature_names.json"
    metrics_path: str = "models/training_metrics.json"


def get_database_config() -> DatabaseConfig:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is required")
    return DatabaseConfig(url=url)


def get_model_config() -> ModelConfig:
    return ModelConfig()
