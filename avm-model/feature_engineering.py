"""
Feature Engineering for GPR AVM Model

Based on the development plan:
- Core property features (beds, baths, sqft, year_built, etc.)
- Location features (zip code, lat/lng)
- Time features (sale month, year, days since sale)
- Derived features (price per sqft of comps, age, etc.)
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Tuple
import structlog

logger = structlog.get_logger()


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all feature engineering transformations.

    Input DataFrame should have columns from sales_history + properties join.
    """
    logger.info("feature_engineering_start", rows=len(df))

    df = df.copy()

    # Convert Decimal columns to float
    decimal_cols = ['sale_price', 'list_price', 'original_list_price', 'latitude', 'longitude']
    for col in decimal_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # ========================================
    # 1. Core Property Features (clean/impute)
    # ========================================

    # Beds - cap outliers, fill missing with median
    df['beds'] = df['beds_at_sale'].fillna(df['beds_at_sale'].median())
    df['beds'] = df['beds'].clip(0, 10)

    # Baths - combine full + half
    df['baths_full'] = df['baths_full_at_sale'].fillna(0)
    df['baths_half'] = df['baths_half_at_sale'].fillna(0)
    df['baths_total'] = df['baths_full'] + (df['baths_half'] * 0.5)
    df['baths_total'] = df['baths_total'].clip(0, 10)

    # Square footage - critical feature
    df['sqft'] = df['sqft_at_sale'].fillna(df['sqft_at_sale'].median())
    df['sqft'] = df['sqft'].clip(300, 15000)  # Reasonable range

    # Year built
    current_year = datetime.now().year
    df['year_built'] = df['year_built_at_sale'].fillna(1990)  # Default to 1990
    df['year_built'] = df['year_built'].clip(1900, current_year)

    # ========================================
    # 2. Derived Features
    # ========================================

    # Property age at time of sale
    df['sale_year'] = pd.to_datetime(df['sale_date']).dt.year
    df['age_at_sale'] = df['sale_year'] - df['year_built']
    df['age_at_sale'] = df['age_at_sale'].clip(0, 150)

    # Age buckets (non-linear relationship with price)
    df['is_new_construction'] = (df['age_at_sale'] <= 2).astype(int)
    df['is_recent'] = ((df['age_at_sale'] > 2) & (df['age_at_sale'] <= 10)).astype(int)
    df['is_established'] = ((df['age_at_sale'] > 10) & (df['age_at_sale'] <= 30)).astype(int)
    df['is_older'] = (df['age_at_sale'] > 30).astype(int)

    # Bed/bath ratio
    df['bed_bath_ratio'] = df['beds'] / (df['baths_total'] + 0.5)

    # Sqft per bedroom
    df['sqft_per_bed'] = df['sqft'] / (df['beds'] + 1)

    # ========================================
    # 3. Location Features
    # ========================================

    # Zip code as category (will be one-hot encoded later or used as categorical)
    df['zip_code'] = df['zip_code'].fillna('00000').astype(str).str[:5]

    # Lat/Lng - convert from Decimal to float and fill with Las Vegas center if missing
    las_vegas_lat = 36.1699
    las_vegas_lng = -115.1398
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce').fillna(las_vegas_lat).astype(float)
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce').fillna(las_vegas_lng).astype(float)

    # Distance from Las Vegas Strip (center point)
    strip_lat, strip_lng = 36.1147, -115.1728
    df['dist_from_strip'] = haversine_distance(
        df['latitude'], df['longitude'],
        strip_lat, strip_lng
    )

    # Distance from downtown
    downtown_lat, downtown_lng = 36.1699, -115.1398
    df['dist_from_downtown'] = haversine_distance(
        df['latitude'], df['longitude'],
        downtown_lat, downtown_lng
    )

    # ========================================
    # 4. Time Features
    # ========================================

    df['sale_date'] = pd.to_datetime(df['sale_date'])
    df['sale_month'] = df['sale_date'].dt.month
    df['sale_quarter'] = df['sale_date'].dt.quarter
    df['sale_year'] = df['sale_date'].dt.year

    # Days since a reference date (for time trends)
    reference_date = pd.Timestamp('2013-01-01')
    df['days_since_ref'] = (df['sale_date'] - reference_date).dt.days

    # Seasonal indicators
    df['is_spring'] = df['sale_month'].isin([3, 4, 5]).astype(int)
    df['is_summer'] = df['sale_month'].isin([6, 7, 8]).astype(int)
    df['is_fall'] = df['sale_month'].isin([9, 10, 11]).astype(int)
    df['is_winter'] = df['sale_month'].isin([12, 1, 2]).astype(int)

    # ========================================
    # 5. Market Features
    # ========================================

    # Days on market (if available)
    df['dom'] = df['days_on_market'].fillna(df['days_on_market'].median())
    df['dom'] = df['dom'].clip(0, 365)

    # List to sale price ratio
    df['list_price'] = df['list_price'].fillna(df['sale_price'])
    df['sale_to_list_ratio'] = df['sale_price'] / (df['list_price'] + 1)
    df['sale_to_list_ratio'] = df['sale_to_list_ratio'].clip(0.5, 1.5)

    # ========================================
    # 6. Property Type Features
    # ========================================

    # Simplify property types
    df['property_type'] = df['property_type'].fillna('Unknown')
    df['is_single_family'] = df['property_type'].str.contains(
        'Single|SFR|Detached', case=False, na=False
    ).astype(int)
    df['is_condo'] = df['property_type'].str.contains(
        'Condo|Townhouse|Attached', case=False, na=False
    ).astype(int)

    logger.info("feature_engineering_complete",
                rows=len(df),
                features=len(df.columns))

    return df


def haversine_distance(lat1, lon1, lat2, lon2) -> pd.Series:
    """Calculate distance in miles between two points using Haversine formula."""
    R = 3959  # Earth's radius in miles

    lat1_rad = np.radians(lat1)
    lat2_rad = np.radians(lat2)
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)

    a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))

    return R * c


def get_feature_columns() -> list:
    """Return list of feature columns to use for training."""
    return [
        # Core property features
        'beds',
        'baths_total',
        'sqft',
        'year_built',

        # Derived features
        'age_at_sale',
        'is_new_construction',
        'is_recent',
        'is_established',
        'is_older',
        'bed_bath_ratio',
        'sqft_per_bed',

        # Location features
        'latitude',
        'longitude',
        'dist_from_strip',
        'dist_from_downtown',

        # Time features
        'sale_month',
        'sale_quarter',
        'sale_year',
        'days_since_ref',
        'is_spring',
        'is_summer',
        'is_fall',
        'is_winter',

        # Market features
        'dom',
        'sale_to_list_ratio',

        # Property type features
        'is_single_family',
        'is_condo',
    ]


def prepare_training_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Prepare features (X) and target (y) for training.

    Returns:
        X: Feature DataFrame
        y: Target Series (sale_price)
    """
    # Apply feature engineering
    df = engineer_features(df)

    # Get feature columns
    feature_cols = get_feature_columns()

    # Filter to only sales (not leases) with valid prices
    df = df[df['source'] == 'trestle_sale'].copy()
    df = df[df['sale_price'] > 10000]  # Remove obviously bad data
    df = df[df['sale_price'] < 10000000]  # Cap at $10M

    # Remove outliers using IQR
    Q1 = df['sale_price'].quantile(0.01)
    Q3 = df['sale_price'].quantile(0.99)
    df = df[(df['sale_price'] >= Q1) & (df['sale_price'] <= Q3)]

    logger.info("training_data_prepared",
                rows=len(df),
                features=len(feature_cols),
                price_min=df['sale_price'].min(),
                price_max=df['sale_price'].max(),
                price_median=df['sale_price'].median())

    X = df[feature_cols].copy()
    y = df['sale_price'].copy()

    # Handle any remaining NaN values
    X = X.fillna(0)

    return X, y
