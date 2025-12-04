"""
Valuation service - core ML inference with LightGBM model

Uses the trained LightGBM model for property valuation with:
- Feature engineering matching the training pipeline
- StandardScaler normalization
- Confidence scoring based on model metrics
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

import numpy as np
import pandas as pd
import structlog

from app.models.schemas import (
    PropertyBase,
    ValuationResult,
    ValuationFactor,
    ValuationResponse,
    ComparableSale,
    MarketTrends,
)
from app.services.model_loader import (
    get_model,
    get_scaler,
    get_feature_names,
    get_training_metrics,
    get_model_version,
    is_model_loaded,
    haversine_distance,
)

logger = structlog.get_logger()


def generate_valuation_id() -> str:
    """Generate unique valuation ID"""
    return f"val_{uuid4().hex[:12]}"


def prepare_features(property_data: PropertyBase) -> pd.DataFrame:
    """
    Prepare feature vector for model inference.

    Matches the feature engineering from training pipeline.
    """
    current_year = datetime.now().year
    current_month = datetime.now().month
    current_quarter = (current_month - 1) // 3 + 1

    # Calculate days since reference date (matching training)
    reference_date = pd.Timestamp('2013-01-01')
    days_since_ref = (pd.Timestamp.now() - reference_date).days

    # Core property features
    beds = property_data.beds or 3
    baths_full = property_data.baths_full or 2
    baths_half = property_data.baths_half or 0
    baths_total = baths_full + (baths_half * 0.5)
    sqft = property_data.sqft_living or 1800
    year_built = property_data.year_built or 1990

    # Derived features
    age_at_sale = current_year - year_built
    is_new_construction = 1 if age_at_sale <= 2 else 0
    is_recent = 1 if 2 < age_at_sale <= 10 else 0
    is_established = 1 if 10 < age_at_sale <= 30 else 0
    is_older = 1 if age_at_sale > 30 else 0

    bed_bath_ratio = beds / (baths_total + 0.5)
    sqft_per_bed = sqft / (beds + 1)

    # Location features
    latitude = property_data.latitude or 36.1699  # Las Vegas center
    longitude = property_data.longitude or -115.1398

    # Distance from landmarks (matching training)
    strip_lat, strip_lng = 36.1147, -115.1728
    downtown_lat, downtown_lng = 36.1699, -115.1398

    dist_from_strip = haversine_distance(latitude, longitude, strip_lat, strip_lng)
    dist_from_downtown = haversine_distance(latitude, longitude, downtown_lat, downtown_lng)

    # Seasonal features
    is_spring = 1 if current_month in [3, 4, 5] else 0
    is_summer = 1 if current_month in [6, 7, 8] else 0
    is_fall = 1 if current_month in [9, 10, 11] else 0
    is_winter = 1 if current_month in [12, 1, 2] else 0

    # Market features (use defaults for new valuations)
    dom = 30  # Average days on market
    sale_to_list_ratio = 0.98  # Typical ratio

    # Property type features
    property_type = property_data.property_type or ""
    is_single_family = 1 if any(t in property_type.lower() for t in ['single', 'sfr', 'detached']) else 0
    is_condo = 1 if any(t in property_type.lower() for t in ['condo', 'townhouse', 'attached']) else 0

    # Build feature vector in exact order expected by model
    features = {
        'beds': beds,
        'baths_total': baths_total,
        'sqft': sqft,
        'year_built': year_built,
        'age_at_sale': age_at_sale,
        'is_new_construction': is_new_construction,
        'is_recent': is_recent,
        'is_established': is_established,
        'is_older': is_older,
        'bed_bath_ratio': bed_bath_ratio,
        'sqft_per_bed': sqft_per_bed,
        'latitude': latitude,
        'longitude': longitude,
        'dist_from_strip': dist_from_strip,
        'dist_from_downtown': dist_from_downtown,
        'sale_month': current_month,
        'sale_quarter': current_quarter,
        'sale_year': current_year,
        'days_since_ref': days_since_ref,
        'is_spring': is_spring,
        'is_summer': is_summer,
        'is_fall': is_fall,
        'is_winter': is_winter,
        'dom': dom,
        'sale_to_list_ratio': sale_to_list_ratio,
        'is_single_family': is_single_family,
        'is_condo': is_condo,
    }

    # Convert to DataFrame with correct column order
    feature_names = get_feature_names()
    df = pd.DataFrame([features])[feature_names]

    return df


def generate_factors(
    property_data: PropertyBase,
    prediction: float,
    comparables: list[ComparableSale],
) -> list[ValuationFactor]:
    """
    Generate valuation factors explaining the estimate.

    This provides interpretable explanations based on property characteristics.
    """
    factors = []
    metrics = get_training_metrics()
    price_range = metrics.get('price_range', {})
    median_price = price_range.get('median', 300000)

    # Square footage factor
    sqft = property_data.sqft_living or 1800
    avg_sqft = 1800  # Las Vegas average
    sqft_diff = sqft - avg_sqft

    if abs(sqft_diff) > 200:
        # Estimate ~$100-150/sqft impact
        sqft_impact = int(sqft_diff * 120)
        factors.append(ValuationFactor(
            feature="sqft_living",
            impact=sqft_impact,
            direction="positive" if sqft_impact > 0 else "negative",
            explanation=f"{abs(sqft_diff):,} sqft {'above' if sqft_diff > 0 else 'below'} market average"
        ))

    # Location factor (distance from strip)
    if property_data.latitude and property_data.longitude:
        strip_lat, strip_lng = 36.1147, -115.1728
        dist = haversine_distance(
            property_data.latitude, property_data.longitude,
            strip_lat, strip_lng
        )
        if dist < 5:
            location_impact = int((5 - dist) * 8000)
            factors.append(ValuationFactor(
                feature="location",
                impact=location_impact,
                direction="positive",
                explanation=f"Close proximity to Las Vegas Strip ({dist:.1f} mi)"
            ))
        elif dist > 15:
            location_impact = int((dist - 15) * -3000)
            factors.append(ValuationFactor(
                feature="location",
                impact=location_impact,
                direction="negative",
                explanation=f"Distance from central Las Vegas ({dist:.1f} mi)"
            ))

    # Age factor
    year_built = property_data.year_built or 1990
    current_year = datetime.now().year
    age = current_year - year_built

    if age <= 5:
        age_impact = int((5 - age) * 5000)
        factors.append(ValuationFactor(
            feature="year_built",
            impact=age_impact,
            direction="positive",
            explanation=f"New construction ({year_built})"
        ))
    elif age > 40:
        age_impact = int((age - 40) * -800)
        factors.append(ValuationFactor(
            feature="year_built",
            impact=age_impact,
            direction="negative",
            explanation=f"Older home (built {year_built})"
        ))

    # Bedroom factor
    beds = property_data.beds or 3
    if beds >= 5:
        bed_impact = (beds - 4) * 15000
        factors.append(ValuationFactor(
            feature="bedrooms",
            impact=bed_impact,
            direction="positive",
            explanation=f"Large home with {beds} bedrooms"
        ))
    elif beds <= 2:
        bed_impact = (beds - 3) * 12000
        factors.append(ValuationFactor(
            feature="bedrooms",
            impact=bed_impact,
            direction="negative",
            explanation=f"Smaller home with {beds} bedroom{'s' if beds > 1 else ''}"
        ))

    # Pool factor (Vegas premium)
    if property_data.pool:
        factors.append(ValuationFactor(
            feature="pool",
            impact=18000,
            direction="positive",
            explanation="Pool adds significant value in Las Vegas market"
        ))

    # Comparable adjustment factor
    if comparables:
        comp_avg = sum(c.sale_price for c in comparables) / len(comparables)
        comp_diff = prediction - comp_avg
        if abs(comp_diff) > 20000:
            factors.append(ValuationFactor(
                feature="comparable_adjustment",
                impact=int(comp_diff),
                direction="positive" if comp_diff > 0 else "negative",
                explanation=f"Adjusted from comparable average of ${comp_avg:,.0f}"
            ))

    # Sort by absolute impact and return top 5
    return sorted(factors, key=lambda x: abs(x.impact), reverse=True)[:5]


def calculate_confidence(
    property_data: PropertyBase,
    comparables: list[ComparableSale],
    prediction: float,
) -> float:
    """
    Calculate confidence score based on:
    - Number and quality of comparables
    - Data completeness of subject property
    - Model performance metrics
    """
    base_confidence = 0.7  # Start with model's average confidence

    # Adjust for comparable quality
    if comparables:
        avg_match = sum(c.match_score for c in comparables) / len(comparables)
        comp_count_bonus = min(len(comparables) / 5, 1.0) * 0.1
        match_bonus = avg_match * 0.1
        base_confidence += comp_count_bonus + match_bonus

    # Adjust for data completeness
    completeness = 0
    if property_data.sqft_living:
        completeness += 0.3
    if property_data.beds:
        completeness += 0.2
    if property_data.year_built:
        completeness += 0.2
    if property_data.latitude and property_data.longitude:
        completeness += 0.3

    base_confidence += (completeness - 0.5) * 0.1

    # Clamp to valid range
    return round(min(max(base_confidence, 0.4), 0.95), 2)


async def estimate_value(
    property_data: PropertyBase,
    comparables: list[ComparableSale],
) -> tuple[ValuationResult, list[ValuationFactor]]:
    """
    Estimate property value using the trained LightGBM model.

    Args:
        property_data: Subject property characteristics
        comparables: List of comparable sales (for context/confidence)

    Returns:
        Tuple of (ValuationResult, list of explanation factors)
    """
    model = get_model()
    scaler = get_scaler()

    if model is None:
        # Fallback to comparable-based estimate if model not loaded
        logger.warning("model_not_loaded_using_fallback")
        return await _fallback_estimate(property_data, comparables)

    # Prepare features
    features_df = prepare_features(property_data)

    # Scale features
    if scaler is not None:
        features_scaled = scaler.transform(features_df)
        features_df = pd.DataFrame(features_scaled, columns=features_df.columns)

    # Get prediction
    prediction = model.predict(features_df)[0]

    # Round to nearest $1000
    estimate = round(prediction, -3)

    # Ensure reasonable bounds ($50k - $5M for Las Vegas)
    estimate = max(50000, min(5000000, estimate))

    logger.info("valuation_predicted",
                estimate=f"${estimate:,.0f}",
                sqft=property_data.sqft_living,
                beds=property_data.beds)

    # Calculate confidence
    confidence = calculate_confidence(property_data, comparables, estimate)

    # Calculate range based on confidence and model MAPE
    metrics = get_training_metrics()
    mape = metrics.get('mape', 10.0)  # ~10% average error

    # Tighter range for higher confidence
    range_pct = (mape / 100) * (1.5 - confidence)
    range_pct = max(0.05, min(0.20, range_pct))  # 5-20% range

    # Generate explanation factors
    factors = generate_factors(property_data, estimate, comparables)

    return (
        ValuationResult(
            estimate=estimate,
            range_low=round(estimate * (1 - range_pct), -3),
            range_high=round(estimate * (1 + range_pct), -3),
            confidence=confidence,
        ),
        factors,
    )


async def _fallback_estimate(
    property_data: PropertyBase,
    comparables: list[ComparableSale],
) -> tuple[ValuationResult, list[ValuationFactor]]:
    """
    Fallback to comparable-based estimate if model unavailable.

    Uses intelligent weighting that heavily favors:
    1. High match scores (exponential weighting)
    2. Same bedroom count ("model match" bonus)
    3. Similar square footage
    """
    if not comparables:
        base_estimate = 350000
        return (
            ValuationResult(
                estimate=base_estimate,
                range_low=base_estimate * 0.85,
                range_high=base_estimate * 1.15,
                confidence=0.5,
            ),
            [],
        )

    subject_beds = property_data.beds
    subject_sqft = property_data.sqft_living

    # Calculate enhanced weights for each comp
    weights = []
    adjusted_prices = []

    for comp in comparables:
        # Base weight from match score - use exponential to heavily favor high matches
        # A 95% match gets 4x the weight of an 80% match
        base_weight = comp.match_score ** 3

        # Model match bonus: same bedroom count gets 3x weight
        bed_multiplier = 1.0
        if subject_beds is not None and comp.beds is not None:
            if comp.beds == subject_beds:
                bed_multiplier = 3.0  # Exact match - triple the weight
            elif abs(comp.beds - subject_beds) == 1:
                bed_multiplier = 0.5  # One bedroom difference - halve weight
            else:
                bed_multiplier = 0.25  # 2+ bedroom difference - quarter weight

        # Sqft similarity bonus
        sqft_multiplier = 1.0
        if subject_sqft is not None and comp.sqft is not None:
            sqft_diff_pct = abs(comp.sqft - subject_sqft) / subject_sqft
            if sqft_diff_pct <= 0.05:  # Within 5% - model match territory
                sqft_multiplier = 1.5
            elif sqft_diff_pct <= 0.15:  # Within 15%
                sqft_multiplier = 1.0
            else:
                sqft_multiplier = 0.7

        final_weight = base_weight * bed_multiplier * sqft_multiplier
        weights.append(final_weight)

        # Adjust price for bedroom differences
        adjusted_price = comp.sale_price
        if subject_beds is not None and comp.beds is not None:
            bed_diff = subject_beds - comp.beds
            # Adjust ~$10k per bedroom difference (Las Vegas market avg)
            adjusted_price += bed_diff * 10000

        adjusted_prices.append(adjusted_price)

        logger.debug(
            "comp_weight_calc",
            address=comp.address,
            match_score=comp.match_score,
            beds=comp.beds,
            sqft=comp.sqft,
            base_weight=round(base_weight, 4),
            bed_mult=bed_multiplier,
            sqft_mult=sqft_multiplier,
            final_weight=round(final_weight, 4),
            original_price=comp.sale_price,
            adjusted_price=adjusted_price,
        )

    # Calculate weighted average
    total_weight = sum(weights) or 1
    weighted_avg = sum(p * w for p, w in zip(adjusted_prices, weights)) / total_weight

    estimate = round(weighted_avg, -3)

    # Higher confidence if we have a strong model match
    best_match = max(comparables, key=lambda c: c.match_score)
    has_model_match = (
        best_match.match_score >= 0.9
        and subject_beds is not None
        and best_match.beds == subject_beds
    )

    confidence = min(0.7, 0.4 + len(comparables) * 0.06)
    if has_model_match:
        confidence = min(0.85, confidence + 0.15)

    # Calculate data-driven range based on comp variance and match quality
    range_pct = _calculate_range_percentage(
        adjusted_prices=adjusted_prices,
        weights=weights,
        estimate=estimate,
        best_match_score=best_match.match_score,
        has_model_match=has_model_match,
    )

    return (
        ValuationResult(
            estimate=estimate,
            range_low=round(estimate * (1 - range_pct), -3),
            range_high=round(estimate * (1 + range_pct), -3),
            confidence=confidence,
        ),
        [],
    )


def _calculate_range_percentage(
    adjusted_prices: list[float],
    weights: list[float],
    estimate: float,
    best_match_score: float,
    has_model_match: bool,
) -> float:
    """
    Calculate the range percentage based on comp variance and match quality.

    Returns a percentage (0.05 to 0.20) to apply as ± around the estimate.
    """
    if not adjusted_prices or estimate <= 0:
        return 0.15  # Default 15% if no data

    # Calculate weighted standard deviation of comp prices
    total_weight = sum(weights) or 1
    weighted_mean = sum(p * w for p, w in zip(adjusted_prices, weights)) / total_weight

    # Weighted variance
    variance = sum(
        w * (p - weighted_mean) ** 2
        for p, w in zip(adjusted_prices, weights)
    ) / total_weight

    weighted_std = variance ** 0.5

    # Convert to percentage of estimate
    base_range_pct = weighted_std / estimate if estimate > 0 else 0.15

    # Apply match quality multiplier
    # Strong model match = tighter range (0.5x to 0.7x)
    # Weak matches = wider range (1.0x to 1.3x)
    if has_model_match:
        # 95% match → 0.5x multiplier, 90% match → 0.7x multiplier
        match_multiplier = 0.5 + (0.95 - best_match_score) * 4
    else:
        # No model match - use match score to scale
        # 85% match → 1.0x, 70% match → 1.3x
        match_multiplier = 1.0 + (0.85 - best_match_score) * 2

    adjusted_range_pct = base_range_pct * match_multiplier

    # Clamp to reasonable bounds: 5% minimum, 20% maximum
    final_range_pct = max(0.05, min(0.20, adjusted_range_pct))

    logger.debug(
        "range_calc",
        weighted_std=round(weighted_std, 0),
        base_range_pct=round(base_range_pct, 3),
        match_multiplier=round(match_multiplier, 2),
        adjusted_range_pct=round(adjusted_range_pct, 3),
        final_range_pct=round(final_range_pct, 3),
        has_model_match=has_model_match,
    )

    return final_range_pct


def build_valuation_response(
    valuation_id: str,
    property_data: PropertyBase,
    valuation_result: ValuationResult,
    factors: list[ValuationFactor],
    comparables: list[ComparableSale],
    market_trends: Optional[MarketTrends] = None,
) -> ValuationResponse:
    """Build the complete valuation response object"""
    return ValuationResponse(
        id=valuation_id,
        valuation=valuation_result,
        property=property_data,
        factors=factors,
        comparables=comparables,
        market_trends=market_trends,
        model_version=get_model_version(),
        generated_at=datetime.utcnow(),
    )
