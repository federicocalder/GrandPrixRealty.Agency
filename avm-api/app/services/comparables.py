"""
Comparable sales finder using PostGIS spatial queries
"""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import ComparableSale


async def find_comparables(
    db: AsyncSession,
    latitude: float,
    longitude: float,
    property_type: Optional[str] = None,
    beds: Optional[int] = None,
    sqft: Optional[int] = None,
    year_built: Optional[int] = None,
    transaction_type: str = "sale",  # 'sale' or 'lease'
    radius_miles: float = 1.0,
    months_back: int = 6,
    limit: int = 5,
) -> list[ComparableSale]:
    """
    Find comparable sales/leases using PostGIS spatial queries.

    Similarity score is calculated based on:
    - Distance (closer = better)
    - Square footage difference (closer = better)
    - Bedroom count match
    - Year built similarity
    - Property type match

    Args:
        db: Database session
        latitude: Subject property latitude
        longitude: Subject property longitude
        property_type: Property type filter (SingleFamilyResidence, etc.)
        beds: Number of bedrooms for similarity
        sqft: Square footage for similarity
        year_built: Year built for similarity
        transaction_type: 'sale' or 'lease'
        radius_miles: Search radius in miles
        months_back: How many months back to search
        limit: Maximum number of comps to return

    Returns:
        List of comparable sales sorted by match score
    """
    # Convert miles to meters for PostGIS (1 mile = 1609.34 meters)
    radius_meters = radius_miles * 1609.34

    # Calculate date cutoff
    cutoff_date = date.today() - timedelta(days=months_back * 30)

    # Source filter based on transaction type
    source_filter = f"trestle_{transaction_type}"

    # Build the query with similarity scoring
    query = text("""
        WITH subject AS (
            SELECT ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography AS location
        )
        SELECT
            sh.id,
            p.address_full AS address,
            sh.sale_date,
            sh.sale_price,
            sh.beds_at_sale AS beds,
            (COALESCE(sh.baths_full_at_sale, 0) + COALESCE(sh.baths_half_at_sale, 0) * 0.5) AS baths,
            sh.sqft_at_sale AS sqft,
            ST_Distance(p.location, subject.location) / 1609.34 AS distance_miles,
            p.latitude,
            p.longitude,
            -- Similarity scoring (0-1 scale, higher is better)
            (
                -- Distance score (0-0.3): closer is better
                0.3 * (1.0 - LEAST(ST_Distance(p.location, subject.location) / :radius_m, 1.0))
                -- Sqft score (0-0.25): closer to target sqft is better
                + CASE
                    WHEN :sqft < 0 OR sh.sqft_at_sale IS NULL THEN 0.125
                    ELSE 0.25 * (1.0 - LEAST(ABS(sh.sqft_at_sale - :sqft)::float / GREATEST(:sqft, 1), 1.0))
                END
                -- Beds score (0-0.2): exact match is best
                + CASE
                    WHEN :beds < 0 OR sh.beds_at_sale IS NULL THEN 0.1
                    WHEN sh.beds_at_sale = :beds THEN 0.2
                    WHEN ABS(sh.beds_at_sale - :beds) = 1 THEN 0.15
                    ELSE 0.05
                END
                -- Year built score (0-0.15): closer age is better
                + CASE
                    WHEN :year_built < 0 OR sh.year_built_at_sale IS NULL THEN 0.075
                    ELSE 0.15 * (1.0 - LEAST(ABS(sh.year_built_at_sale - :year_built)::float / 30, 1.0))
                END
                -- Property type score (0-0.1): match is best
                + CASE
                    WHEN :prop_type = '' THEN 0.05
                    WHEN p.property_type = :prop_type THEN 0.1
                    ELSE 0.0
                END
            ) AS match_score
        FROM subject, avm.sales_history sh
        JOIN avm.properties p ON sh.property_id = p.id
        WHERE
            p.location IS NOT NULL
            AND ST_DWithin(p.location, subject.location, :radius_m)
            AND sh.sale_date >= :cutoff_date
            AND sh.source = :source_filter
            AND sh.sale_price > 0
        ORDER BY match_score DESC, sh.sale_date DESC
        LIMIT :limit
    """)

    # Handle NULL parameters with explicit type casting for asyncpg
    # If sqft is None, use -1 as a sentinel value and handle in query
    result = await db.execute(
        query,
        {
            "lat": latitude,
            "lng": longitude,
            "radius_m": radius_meters,
            "cutoff_date": cutoff_date,
            "source_filter": source_filter,
            "sqft": sqft if sqft is not None else -1,  # Sentinel for NULL
            "beds": beds if beds is not None else -1,  # Sentinel for NULL
            "year_built": year_built if year_built is not None else -1,  # Sentinel for NULL
            "prop_type": property_type if property_type is not None else "",  # Empty string for NULL
            "limit": limit,
        },
    )

    rows = result.fetchall()

    comparables = []
    for row in rows:
        comparables.append(
            ComparableSale(
                id=row.id,
                address=row.address,
                sale_date=row.sale_date,
                sale_price=float(row.sale_price),
                beds=row.beds,
                baths=float(row.baths) if row.baths else None,
                sqft=row.sqft,
                distance_miles=round(float(row.distance_miles), 2),
                match_score=round(float(row.match_score), 2),
                latitude=float(row.latitude) if row.latitude else None,
                longitude=float(row.longitude) if row.longitude else None,
            )
        )

    return comparables
