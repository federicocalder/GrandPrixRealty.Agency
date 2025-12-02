"""
Pydantic schemas for API request/response models
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# =============================================================================
# Property Schemas
# =============================================================================


class PropertyBase(BaseModel):
    """Base property attributes"""

    address_full: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    subdivision: Optional[str] = None
    property_type: Optional[str] = None
    beds: Optional[int] = None
    baths_full: Optional[int] = None
    baths_half: Optional[int] = None
    sqft_living: Optional[int] = None
    sqft_lot: Optional[int] = None
    year_built: Optional[int] = None
    stories: Optional[int] = None
    garage_spaces: Optional[int] = None
    pool: Optional[bool] = None


class PropertyResponse(PropertyBase):
    """Property response with ID"""

    model_config = ConfigDict(from_attributes=True)

    id: UUID


# =============================================================================
# Valuation Schemas
# =============================================================================


class ValuationRequest(BaseModel):
    """Request for property valuation"""

    address: str = Field(..., min_length=5, description="Property address to value")
    include_comps: bool = Field(default=True, description="Include comparable sales")
    include_shap: bool = Field(default=True, description="Include SHAP explanations")


class ValuationFactor(BaseModel):
    """Single factor affecting valuation (SHAP)"""

    feature: str = Field(..., description="Feature name")
    impact: float = Field(..., description="Dollar impact on valuation")
    direction: str = Field(..., description="positive or negative")
    explanation: str = Field(..., description="Human-readable explanation")


class ComparableSale(BaseModel):
    """Comparable sale for valuation"""

    id: UUID
    address: str
    sale_date: date
    sale_price: float
    beds: Optional[int] = None
    baths: Optional[float] = None
    sqft: Optional[int] = None
    distance_miles: float
    match_score: float = Field(..., ge=0, le=1, description="Similarity score 0-1")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MarketTrends(BaseModel):
    """Market trend data for area"""

    zip_median_price: Optional[float] = None
    price_change_yoy: Optional[float] = None
    days_on_market_avg: Optional[float] = None
    inventory_months: Optional[float] = None


class ValuationResult(BaseModel):
    """Core valuation result"""

    estimate: float = Field(..., description="Predicted value")
    range_low: float = Field(..., description="Low end of confidence interval")
    range_high: float = Field(..., description="High end of confidence interval")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")


class ValuationResponse(BaseModel):
    """Full valuation response"""

    id: str = Field(..., description="Valuation ID (val_xxx)")
    valuation: ValuationResult
    property: PropertyBase
    factors: list[ValuationFactor] = Field(
        default_factory=list, description="Top factors affecting value"
    )
    comparables: list[ComparableSale] = Field(
        default_factory=list, description="Comparable sales"
    )
    market_trends: Optional[MarketTrends] = None
    model_version: str
    generated_at: datetime


# =============================================================================
# Lead Schemas
# =============================================================================


class LeadCreateRequest(BaseModel):
    """Request to capture a lead"""

    valuation_id: str = Field(..., description="Associated valuation ID")
    email: str = Field(..., description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone")
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    lead_type: str = Field(
        default="seller", description="seller, landlord, or curious"
    )
    property_timeline: Optional[str] = Field(
        None, description="now, 3_months, 6_months, just_curious"
    )


class LeadResponse(BaseModel):
    """Lead creation response"""

    lead_id: str
    report_url: str
    message: str = "Your report is ready!"


# =============================================================================
# Health Check
# =============================================================================


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = "healthy"
    version: str
    model_loaded: bool = True
