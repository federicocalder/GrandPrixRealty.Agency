"""
Model loader service - loads and caches the trained LightGBM model.

Loads:
- LightGBM model
- StandardScaler for feature normalization
- Feature names for inference
- Training metrics for confidence scoring
"""

import json
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import structlog

logger = structlog.get_logger()

# Global model cache
_model = None
_scaler = None
_feature_names = None
_metrics = None


def get_model_dir() -> Path:
    """Get the models directory path."""
    return Path(__file__).parent.parent.parent / "models"


def load_model():
    """
    Load the trained model and associated artifacts.

    This is called once at startup and cached globally.
    """
    global _model, _scaler, _feature_names, _metrics

    model_dir = get_model_dir()

    model_path = model_dir / "avm_model.joblib"
    scaler_path = model_dir / "avm_scaler.joblib"
    feature_names_path = model_dir / "feature_names.json"
    metrics_path = model_dir / "training_metrics.json"

    # Check if model files exist
    if not model_path.exists():
        logger.warning("model_not_found", path=str(model_path))
        return False

    try:
        # Load model
        _model = joblib.load(model_path)
        logger.info("model_loaded", path=str(model_path))

        # Load scaler
        if scaler_path.exists():
            _scaler = joblib.load(scaler_path)
            logger.info("scaler_loaded", path=str(scaler_path))

        # Load feature names
        if feature_names_path.exists():
            with open(feature_names_path) as f:
                _feature_names = json.load(f)
            logger.info("feature_names_loaded", count=len(_feature_names))

        # Load metrics
        if metrics_path.exists():
            with open(metrics_path) as f:
                _metrics = json.load(f)
            logger.info("metrics_loaded",
                       mae=_metrics.get('mae'),
                       r2=_metrics.get('r2'))

        return True

    except Exception as e:
        logger.error("model_load_failed", error=str(e))
        return False


def get_model():
    """Get the loaded LightGBM model."""
    global _model
    if _model is None:
        load_model()
    return _model


def get_scaler():
    """Get the loaded StandardScaler."""
    global _scaler
    if _scaler is None:
        load_model()
    return _scaler


def get_feature_names() -> list[str]:
    """Get the feature names used by the model."""
    global _feature_names
    if _feature_names is None:
        load_model()
    return _feature_names or []


def get_training_metrics() -> dict:
    """Get the training metrics for confidence scoring."""
    global _metrics
    if _metrics is None:
        load_model()
    return _metrics or {}


def get_model_version() -> str:
    """Get the model version string."""
    metrics = get_training_metrics()
    return metrics.get("model_version", "gpr-avm-v1.0.0")


def is_model_loaded() -> bool:
    """Check if the model is loaded and ready for inference."""
    return _model is not None


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two points using Haversine formula."""
    R = 3959  # Earth's radius in miles

    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)

    a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))

    return R * c
