#!/usr/bin/env python3
"""
GPR AVM Model Training Script

Trains a LightGBM model on historical sales data from the database.

Usage:
    python train.py                    # Full training
    python train.py --sample 10000     # Train on sample (for testing)
    python train.py --evaluate-only    # Just evaluate existing model
"""

import argparse
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

import asyncpg
import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import structlog
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
from tqdm import tqdm

from config import get_database_config, get_model_config
from feature_engineering import prepare_training_data, get_feature_columns

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


async def fetch_training_data(sample_size: int = None) -> pd.DataFrame:
    """
    Fetch sales data from database for training.

    Args:
        sample_size: If set, only fetch this many records (for testing)
    """
    db_config = get_database_config()

    logger.info("connecting_to_database")

    # Disable prepared statement cache for Supavisor compatibility
    conn = await asyncpg.connect(db_config.url, statement_cache_size=0)

    try:
        # Build query - join sales_history with properties
        query = """
            SELECT
                s.id as sale_id,
                s.sale_price,
                s.sale_date,
                s.close_date,
                s.days_on_market,
                s.list_price,
                s.original_list_price,
                s.beds_at_sale,
                s.baths_full_at_sale,
                s.baths_half_at_sale,
                s.sqft_at_sale,
                s.year_built_at_sale,
                s.latitude,
                s.longitude,
                s.zip_code,
                s.source,
                p.property_type,
                p.subdivision,
                p.city
            FROM avm.sales_history s
            LEFT JOIN avm.properties p ON s.property_id = p.id
            WHERE s.source = 'trestle_sale'
              AND s.sale_price > 10000
              AND s.sale_price < 10000000
        """

        if sample_size:
            query += f" ORDER BY RANDOM() LIMIT {sample_size}"

        logger.info("fetching_data", sample_size=sample_size or "all")

        rows = await conn.fetch(query)

        logger.info("data_fetched", rows=len(rows))

        # Convert to DataFrame
        df = pd.DataFrame([dict(r) for r in rows])

        return df

    finally:
        await conn.close()


def train_model(X_train, y_train, X_val, y_val, config):
    """
    Train LightGBM model with early stopping.
    """
    logger.info("training_model",
                train_size=len(X_train),
                val_size=len(X_val))

    # Create datasets
    train_data = lgb.Dataset(X_train, label=y_train)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    # LightGBM parameters
    params = {
        'objective': 'regression',
        'metric': 'mae',
        'boosting_type': 'gbdt',
        'n_estimators': config.n_estimators,
        'learning_rate': config.learning_rate,
        'max_depth': config.max_depth,
        'num_leaves': config.num_leaves,
        'min_child_samples': config.min_child_samples,
        'subsample': config.subsample,
        'colsample_bytree': config.colsample_bytree,
        'reg_alpha': config.reg_alpha,
        'reg_lambda': config.reg_lambda,
        'random_state': config.random_state,
        'verbose': -1,
    }

    # Train with early stopping
    callbacks = [
        lgb.early_stopping(stopping_rounds=config.early_stopping_rounds),
        lgb.log_evaluation(period=100),
    ]

    model = lgb.train(
        params,
        train_data,
        valid_sets=[train_data, val_data],
        valid_names=['train', 'val'],
        callbacks=callbacks,
    )

    logger.info("training_complete",
                best_iteration=model.best_iteration,
                best_score=model.best_score)

    return model


def evaluate_model(model, X_test, y_test) -> dict:
    """
    Evaluate model performance on test set.
    """
    logger.info("evaluating_model", test_size=len(X_test))

    y_pred = model.predict(X_test)

    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    # Calculate MAPE (Mean Absolute Percentage Error)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

    # Calculate median absolute error
    median_ae = np.median(np.abs(y_test - y_pred))

    # Percentage within 5%, 10%, 15% of actual
    pct_error = np.abs((y_test - y_pred) / y_test) * 100
    within_5 = (pct_error <= 5).mean() * 100
    within_10 = (pct_error <= 10).mean() * 100
    within_15 = (pct_error <= 15).mean() * 100

    metrics = {
        'mae': float(mae),
        'rmse': float(rmse),
        'r2': float(r2),
        'mape': float(mape),
        'median_ae': float(median_ae),
        'within_5_pct': float(within_5),
        'within_10_pct': float(within_10),
        'within_15_pct': float(within_15),
        'test_size': len(X_test),
        'price_range': {
            'min': float(y_test.min()),
            'max': float(y_test.max()),
            'median': float(y_test.median()),
            'mean': float(y_test.mean()),
        }
    }

    logger.info("evaluation_complete",
                mae=f"${mae:,.0f}",
                rmse=f"${rmse:,.0f}",
                r2=f"{r2:.4f}",
                mape=f"{mape:.2f}%",
                within_10_pct=f"{within_10:.1f}%")

    return metrics


def save_model(model, scaler, feature_names, metrics, config):
    """
    Save trained model, scaler, and metadata.
    """
    # Create output directory
    output_dir = Path(config.model_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save model
    joblib.dump(model, config.model_path)
    logger.info("model_saved", path=config.model_path)

    # Save scaler
    joblib.dump(scaler, config.scaler_path)
    logger.info("scaler_saved", path=config.scaler_path)

    # Save feature names
    with open(config.feature_names_path, 'w') as f:
        json.dump(feature_names, f, indent=2)
    logger.info("feature_names_saved", path=config.feature_names_path)

    # Save metrics with timestamp
    metrics['trained_at'] = datetime.now().isoformat()
    metrics['model_version'] = 'gpr-avm-v1.0.0'
    metrics['feature_count'] = len(feature_names)

    with open(config.metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    logger.info("metrics_saved", path=config.metrics_path)


def print_feature_importance(model, feature_names):
    """Print feature importance ranking."""
    importance = model.feature_importance(importance_type='gain')
    feature_importance = sorted(
        zip(feature_names, importance),
        key=lambda x: x[1],
        reverse=True
    )

    print("\n" + "="*60)
    print("FEATURE IMPORTANCE (Top 15)")
    print("="*60)

    for i, (name, imp) in enumerate(feature_importance[:15], 1):
        bar = "█" * int(imp / max(importance) * 30)
        print(f"{i:2}. {name:25} {imp:10.0f} {bar}")

    print("="*60)


async def main(sample_size: int = None, evaluate_only: bool = False):
    """Main training pipeline."""
    config = get_model_config()

    print("""
╔═══════════════════════════════════════════════════════════════╗
║           GPR AVM Model Training                              ║
║                                                               ║
║  Training LightGBM model on Las Vegas sales data              ║
╚═══════════════════════════════════════════════════════════════╝
    """)

    # Fetch data
    logger.info("step_1_fetch_data")
    df = await fetch_training_data(sample_size)

    if len(df) == 0:
        logger.error("no_data_found")
        return

    # Prepare features
    logger.info("step_2_feature_engineering")
    X, y = prepare_training_data(df)

    logger.info("data_prepared",
                samples=len(X),
                features=X.shape[1],
                target_median=f"${y.median():,.0f}")

    # Split data
    logger.info("step_3_split_data")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.test_size,
        random_state=config.random_state
    )

    # Further split train into train/val for early stopping
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train,
        test_size=0.1,
        random_state=config.random_state
    )

    logger.info("data_split",
                train=len(X_train),
                val=len(X_val),
                test=len(X_test))

    # Scale features (optional for tree models, but helps with some features)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Convert back to DataFrame for LightGBM
    feature_names = get_feature_columns()
    X_train_df = pd.DataFrame(X_train_scaled, columns=feature_names)
    X_val_df = pd.DataFrame(X_val_scaled, columns=feature_names)
    X_test_df = pd.DataFrame(X_test_scaled, columns=feature_names)

    # Train model
    logger.info("step_4_train_model")
    model = train_model(X_train_df, y_train, X_val_df, y_val, config)

    # Evaluate
    logger.info("step_5_evaluate")
    metrics = evaluate_model(model, X_test_df, y_test)

    # Print feature importance
    print_feature_importance(model, feature_names)

    # Save model
    logger.info("step_6_save_model")
    save_model(model, scaler, feature_names, metrics, config)

    # Print summary
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"  Samples used:     {len(X):,}")
    print(f"  Features:         {len(feature_names)}")
    print(f"  MAE:              ${metrics['mae']:,.0f}")
    print(f"  RMSE:             ${metrics['rmse']:,.0f}")
    print(f"  R²:               {metrics['r2']:.4f}")
    print(f"  MAPE:             {metrics['mape']:.2f}%")
    print(f"  Within 10%:       {metrics['within_10_pct']:.1f}%")
    print(f"  Model saved to:   {config.model_path}")
    print("="*60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train GPR AVM Model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="Train on sample size (for testing)",
    )

    parser.add_argument(
        "--evaluate-only",
        action="store_true",
        help="Only evaluate existing model",
    )

    args = parser.parse_args()

    asyncio.run(main(
        sample_size=args.sample,
        evaluate_only=args.evaluate_only,
    ))
