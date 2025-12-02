"""
Valuation API endpoints
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_db
from app.models.schemas import (
    ValuationRequest,
    ValuationResponse,
    PropertyBase,
)
from app.services import (
    geocode_address,
    find_comparables,
    estimate_value,
    generate_valuation_id,
    build_valuation_response,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/valuations", tags=["valuations"])


@router.post("", response_model=ValuationResponse)
async def create_valuation(
    request: ValuationRequest,
    db: AsyncSession = Depends(get_db),
) -> ValuationResponse:
    """
    Get instant property valuation.

    Geocodes the address, looks up property data, finds comparables,
    and returns a valuation with confidence interval and explanations.
    """
    valuation_id = generate_valuation_id()

    logger.info(
        "valuation_request",
        valuation_id=valuation_id,
        address=request.address,
    )

    # Step 1: Geocode address
    geo_result = await geocode_address(request.address)
    if not geo_result:
        raise HTTPException(
            status_code=400,
            detail="Could not geocode address. Please check the address and try again.",
        )

    logger.info(
        "geocoded_address",
        valuation_id=valuation_id,
        lat=geo_result.latitude,
        lng=geo_result.longitude,
    )

    # Step 2: Look up property in our database (if it exists)
    property_data = await _lookup_property(
        db,
        geo_result.latitude,
        geo_result.longitude,
        geo_result.formatted_address,
    )

    if not property_data:
        # Property not in database - create basic property data from geocoding
        property_data = PropertyBase(
            address_full=geo_result.formatted_address,
            latitude=geo_result.latitude,
            longitude=geo_result.longitude,
            zip_code=geo_result.zip_code,
            city=geo_result.city,
        )

    # Step 3: Find comparable sales
    comparables = []
    if request.include_comps and property_data.latitude and property_data.longitude:
        comparables = await find_comparables(
            db=db,
            latitude=property_data.latitude,
            longitude=property_data.longitude,
            property_type=property_data.property_type,
            beds=property_data.beds,
            sqft=property_data.sqft_living,
            year_built=property_data.year_built,
            transaction_type="sale",  # Default to sales, not leases
            radius_miles=1.0,
            months_back=6,
            limit=5,
        )

    logger.info(
        "found_comparables",
        valuation_id=valuation_id,
        count=len(comparables),
    )

    # Step 4: Generate valuation
    valuation_result, factors = await estimate_value(
        property_data=property_data,
        comparables=comparables,
    )

    # Step 5: Build response
    response = build_valuation_response(
        valuation_id=valuation_id,
        property_data=property_data,
        valuation_result=valuation_result,
        factors=factors if request.include_shap else [],
        comparables=comparables if request.include_comps else [],
    )

    # TODO: Store valuation in database for tracking

    logger.info(
        "valuation_complete",
        valuation_id=valuation_id,
        estimate=valuation_result.estimate,
        confidence=valuation_result.confidence,
    )

    return response


@router.get("/{valuation_id}", response_model=ValuationResponse)
async def get_valuation(
    valuation_id: str,
    db: AsyncSession = Depends(get_db),
) -> ValuationResponse:
    """
    Retrieve a previous valuation by ID.

    TODO: Implement once we're storing valuations in database
    """
    raise HTTPException(
        status_code=404,
        detail=f"Valuation {valuation_id} not found",
    )


async def _lookup_property(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    address: str,
) -> Optional[PropertyBase]:
    """
    Look up property in database by location or address.

    Tries to find a matching property within 50 meters of the given coordinates.
    """
    # Search for property within 50 meters
    query = text("""
        SELECT
            address_full,
            latitude,
            longitude,
            zip_code,
            city,
            subdivision,
            property_type,
            beds,
            baths_full,
            baths_half,
            sqft_living,
            sqft_lot,
            year_built,
            stories,
            garage_spaces,
            pool
        FROM avm.properties
        WHERE location IS NOT NULL
        AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            50  -- 50 meters
        )
        ORDER BY ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
        )
        LIMIT 1
    """)

    result = await db.execute(query, {"lat": latitude, "lng": longitude})
    row = result.fetchone()

    if row:
        return PropertyBase(
            address_full=row.address_full,
            latitude=float(row.latitude) if row.latitude else None,
            longitude=float(row.longitude) if row.longitude else None,
            zip_code=row.zip_code,
            city=row.city,
            subdivision=row.subdivision,
            property_type=row.property_type,
            beds=row.beds,
            baths_full=row.baths_full,
            baths_half=row.baths_half,
            sqft_living=row.sqft_living,
            sqft_lot=row.sqft_lot,
            year_built=row.year_built,
            stories=row.stories,
            garage_spaces=row.garage_spaces,
            pool=row.pool,
        )

    return None
