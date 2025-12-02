"""
Database operations for AVM ETL
Handles bulk inserts into avm.properties and avm.sales_history
"""

import asyncio
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional
from uuid import uuid4

import asyncpg
import structlog

from config import DatabaseConfig
from trestle_client import ClosedSale

logger = structlog.get_logger()


@dataclass
class PropertyRecord:
    """Property record for avm.properties table"""
    id: str
    parcel_id: Optional[str]
    mls_listing_key: str
    address_full: str
    address_normalized: str
    latitude: Optional[float]
    longitude: Optional[float]
    zip_code: Optional[str]
    city: Optional[str]
    subdivision: Optional[str]
    property_type: Optional[str]
    beds: Optional[int]
    baths_full: Optional[int]
    baths_half: Optional[int]
    sqft_living: Optional[int]
    sqft_lot: Optional[int]
    year_built: Optional[int]
    stories: Optional[int]
    garage_spaces: Optional[int]
    pool: Optional[bool]
    source: str
    source_updated_at: datetime


@dataclass
class SaleRecord:
    """Sale record for avm.sales_history table"""
    id: str
    property_id: str
    sale_price: float
    sale_date: date
    close_date: Optional[date]
    mls_listing_key: str
    mls_status: str
    days_on_market: Optional[int]
    list_price: Optional[float]
    original_list_price: Optional[float]
    beds_at_sale: Optional[int]
    baths_full_at_sale: Optional[int]
    baths_half_at_sale: Optional[int]
    sqft_at_sale: Optional[int]
    year_built_at_sale: Optional[int]
    latitude: Optional[float]
    longitude: Optional[float]
    zip_code: Optional[str]
    is_arms_length: bool
    is_outlier: bool
    source: str


def build_address(sale: ClosedSale) -> str:
    """Build full address string from components"""
    parts = []

    if sale.street_number:
        parts.append(sale.street_number)
    if sale.street_name:
        parts.append(sale.street_name)
    if sale.street_suffix:
        parts.append(sale.street_suffix)

    street = " ".join(parts)

    if sale.unit_number:
        street += f" #{sale.unit_number}"

    city_state_zip = []
    if sale.city:
        city_state_zip.append(sale.city)
    if sale.state:
        city_state_zip.append(sale.state)
    if sale.postal_code:
        city_state_zip.append(sale.postal_code)

    if city_state_zip:
        return f"{street}, {', '.join(city_state_zip)}"
    return street


def normalize_address(address: str) -> str:
    """Normalize address for matching (uppercase, standardized)"""
    return address.upper().strip()


def calculate_total_baths(baths_full: Optional[int], baths_half: Optional[int]) -> Optional[float]:
    """Calculate total bathrooms as decimal"""
    if baths_full is None and baths_half is None:
        return None
    full = baths_full or 0
    half = baths_half or 0
    return full + (half * 0.5)


def closed_sale_to_records(sale: ClosedSale) -> tuple[PropertyRecord, SaleRecord]:
    """Convert ClosedSale to Property and Sale records"""
    property_id = str(uuid4())
    sale_id = str(uuid4())

    address_full = build_address(sale)
    address_normalized = normalize_address(address_full)

    # Determine property type from sub_type or main type
    prop_type = sale.property_sub_type or sale.property_type

    # Source includes transaction type: trestle_sale or trestle_lease
    source = f"trestle_{sale.transaction_type}"

    property_record = PropertyRecord(
        id=property_id,
        parcel_id=None,  # Would need county data to populate
        mls_listing_key=sale.listing_key,
        address_full=address_full,
        address_normalized=address_normalized,
        latitude=sale.latitude,
        longitude=sale.longitude,
        zip_code=sale.postal_code,
        city=sale.city,
        subdivision=sale.subdivision,
        property_type=prop_type,
        beds=sale.beds,
        baths_full=sale.baths_full,
        baths_half=sale.baths_half,
        sqft_living=sale.sqft_living,
        sqft_lot=sale.sqft_lot,
        year_built=sale.year_built,
        stories=sale.stories,
        garage_spaces=sale.garage_spaces,
        pool=sale.pool,
        source=source,
        source_updated_at=datetime.utcnow(),
    )

    sale_record = SaleRecord(
        id=sale_id,
        property_id=property_id,
        sale_price=sale.close_price or 0,
        sale_date=sale.close_date or date.today(),
        close_date=sale.close_date,
        mls_listing_key=sale.listing_key,
        mls_status="Closed",
        days_on_market=sale.days_on_market,
        list_price=sale.list_price,
        original_list_price=sale.original_list_price,
        beds_at_sale=sale.beds,
        baths_full_at_sale=sale.baths_full,
        baths_half_at_sale=sale.baths_half,
        sqft_at_sale=sale.sqft_living,
        year_built_at_sale=sale.year_built,
        latitude=sale.latitude,
        longitude=sale.longitude,
        zip_code=sale.postal_code,
        is_arms_length=True,  # Default, would need additional data to detect
        is_outlier=False,
        source=source,  # trestle_sale or trestle_lease
    )

    return property_record, sale_record


class DatabaseLoader:
    """
    Handles bulk loading of property and sales data into PostgreSQL.
    Uses batch inserts with upsert logic.
    """

    def __init__(self, config: DatabaseConfig):
        self.config = config
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Create database connection pool"""
        logger.info("database_connecting", url=self.config.url[:30] + "...")

        self._pool = await asyncpg.create_pool(
            self.config.url,
            min_size=2,
            max_size=10,
            command_timeout=60,
            # Disable prepared statement cache for pgbouncer/supavisor compatibility
            statement_cache_size=0,
        )

        logger.info("database_connected")

    async def close(self):
        """Close database connection pool"""
        if self._pool:
            await self._pool.close()
            logger.info("database_disconnected")

    async def insert_property(self, conn: asyncpg.Connection, prop: PropertyRecord) -> str:
        """
        Insert or update property record.
        Returns the property ID (existing or new).
        """
        # Try to find existing property by mls_listing_key
        existing = await conn.fetchrow(
            """
            SELECT id FROM avm.properties
            WHERE mls_listing_key = $1
            """,
            prop.mls_listing_key,
        )

        if existing:
            # Update existing property
            await conn.execute(
                """
                UPDATE avm.properties SET
                    address_full = $2,
                    address_normalized = $3,
                    latitude = $4::numeric,
                    longitude = $5::numeric,
                    location = CASE
                        WHEN $4 IS NOT NULL AND $5 IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint($5::float, $4::float), 4326)::geography
                        ELSE location
                    END,
                    zip_code = $6,
                    city = $7,
                    subdivision = $8,
                    property_type = $9,
                    beds = $10,
                    baths_full = $11,
                    baths_half = $12,
                    sqft_living = $13,
                    sqft_lot = $14,
                    year_built = $15,
                    stories = $16,
                    garage_spaces = $17,
                    pool = $18,
                    source = $19,
                    source_updated_at = $20,
                    updated_at = NOW()
                WHERE mls_listing_key = $1
                """,
                prop.mls_listing_key,
                prop.address_full,
                prop.address_normalized,
                prop.latitude,
                prop.longitude,
                prop.zip_code,
                prop.city,
                prop.subdivision,
                prop.property_type,
                prop.beds,
                prop.baths_full,
                prop.baths_half,
                prop.sqft_living,
                prop.sqft_lot,
                prop.year_built,
                prop.stories,
                prop.garage_spaces,
                prop.pool,
                prop.source,
                prop.source_updated_at,
            )
            return str(existing["id"])
        else:
            # Insert new property
            await conn.execute(
                """
                INSERT INTO avm.properties (
                    id, parcel_id, mls_listing_key, address_full, address_normalized,
                    latitude, longitude, location,
                    zip_code, city, subdivision, property_type,
                    beds, baths_full, baths_half, sqft_living, sqft_lot,
                    year_built, stories, garage_spaces, pool,
                    source, source_updated_at
                ) VALUES (
                    $1::uuid, $2, $3, $4, $5,
                    $6::numeric, $7::numeric,
                    CASE
                        WHEN $6 IS NOT NULL AND $7 IS NOT NULL
                        THEN ST_SetSRID(ST_MakePoint($7::float, $6::float), 4326)::geography
                        ELSE NULL
                    END,
                    $8, $9, $10, $11,
                    $12, $13, $14, $15, $16,
                    $17, $18, $19, $20,
                    $21, $22
                )
                """,
                prop.id,
                prop.parcel_id,
                prop.mls_listing_key,
                prop.address_full,
                prop.address_normalized,
                prop.latitude,
                prop.longitude,
                prop.zip_code,
                prop.city,
                prop.subdivision,
                prop.property_type,
                prop.beds,
                prop.baths_full,
                prop.baths_half,
                prop.sqft_living,
                prop.sqft_lot,
                prop.year_built,
                prop.stories,
                prop.garage_spaces,
                prop.pool,
                prop.source,
                prop.source_updated_at,
            )
            return prop.id

    async def insert_sale(self, conn: asyncpg.Connection, sale: SaleRecord):
        """
        Insert sale record if it doesn't already exist.
        Uses mls_listing_key + sale_date as unique constraint.
        """
        # Check for existing sale
        existing = await conn.fetchrow(
            """
            SELECT id FROM avm.sales_history
            WHERE mls_listing_key = $1 AND sale_date = $2
            """,
            sale.mls_listing_key,
            sale.sale_date,
        )

        if existing:
            # Update existing sale
            await conn.execute(
                """
                UPDATE avm.sales_history SET
                    property_id = $3::uuid,
                    sale_price = $4::numeric,
                    close_date = $5,
                    mls_status = $6,
                    days_on_market = $7,
                    list_price = $8::numeric,
                    original_list_price = $9::numeric,
                    beds_at_sale = $10,
                    baths_full_at_sale = $11,
                    baths_half_at_sale = $12,
                    sqft_at_sale = $13,
                    year_built_at_sale = $14,
                    latitude = $15::numeric,
                    longitude = $16::numeric,
                    zip_code = $17,
                    is_arms_length = $18,
                    is_outlier = $19,
                    source = $20
                WHERE mls_listing_key = $1 AND sale_date = $2
                """,
                sale.mls_listing_key,
                sale.sale_date,
                sale.property_id,
                sale.sale_price,
                sale.close_date,
                sale.mls_status,
                sale.days_on_market,
                sale.list_price,
                sale.original_list_price,
                sale.beds_at_sale,
                sale.baths_full_at_sale,
                sale.baths_half_at_sale,
                sale.sqft_at_sale,
                sale.year_built_at_sale,
                sale.latitude,
                sale.longitude,
                sale.zip_code,
                sale.is_arms_length,
                sale.is_outlier,
                sale.source,
            )
        else:
            # Insert new sale
            await conn.execute(
                """
                INSERT INTO avm.sales_history (
                    id, property_id, sale_price, sale_date, close_date,
                    mls_listing_key, mls_status, days_on_market, list_price,
                    original_list_price, beds_at_sale, baths_full_at_sale,
                    baths_half_at_sale, sqft_at_sale, year_built_at_sale,
                    latitude, longitude, zip_code,
                    is_arms_length, is_outlier, source
                ) VALUES (
                    $1::uuid, $2::uuid, $3::numeric, $4, $5,
                    $6, $7, $8, $9::numeric,
                    $10::numeric, $11, $12,
                    $13, $14, $15,
                    $16::numeric, $17::numeric, $18,
                    $19, $20, $21
                )
                """,
                sale.id,
                sale.property_id,
                sale.sale_price,
                sale.sale_date,
                sale.close_date,
                sale.mls_listing_key,
                sale.mls_status,
                sale.days_on_market,
                sale.list_price,
                sale.original_list_price,
                sale.beds_at_sale,
                sale.baths_full_at_sale,
                sale.baths_half_at_sale,
                sale.sqft_at_sale,
                sale.year_built_at_sale,
                sale.latitude,
                sale.longitude,
                sale.zip_code,
                sale.is_arms_length,
                sale.is_outlier,
                sale.source,
            )

    async def load_batch(self, sales: list[ClosedSale]) -> tuple[int, int]:
        """
        Load a batch of closed sales into the database.

        Returns:
            Tuple of (properties_loaded, sales_loaded)
        """
        if not sales:
            return 0, 0

        properties_loaded = 0
        sales_loaded = 0

        async with self._pool.acquire() as conn:
            async with conn.transaction():
                for sale in sales:
                    # Skip sales without valid price or date
                    if not sale.close_price or sale.close_price <= 0:
                        logger.debug(
                            "skip_invalid_price",
                            listing_key=sale.listing_key,
                            price=sale.close_price,
                        )
                        continue

                    if not sale.close_date:
                        logger.debug(
                            "skip_no_close_date",
                            listing_key=sale.listing_key,
                        )
                        continue

                    try:
                        prop_record, sale_record = closed_sale_to_records(sale)

                        # Insert property and get ID
                        property_id = await self.insert_property(conn, prop_record)
                        properties_loaded += 1

                        # Update sale record with correct property_id
                        sale_record.property_id = property_id

                        # Insert sale
                        await self.insert_sale(conn, sale_record)
                        sales_loaded += 1

                    except Exception as e:
                        logger.error(
                            "record_insert_error",
                            listing_key=sale.listing_key,
                            error=str(e),
                        )
                        # Continue with next record
                        continue

        return properties_loaded, sales_loaded

    async def get_checkpoint(self) -> Optional[date]:
        """
        Get the last processed close date for resume capability.
        Returns None if no data exists.
        """
        async with self._pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT MAX(sale_date) as last_date
                FROM avm.sales_history
                WHERE source LIKE 'trestle%'
                """
            )
            if result and result["last_date"]:
                return result["last_date"]
        return None

    async def get_stats(self) -> dict:
        """Get current database statistics"""
        async with self._pool.acquire() as conn:
            props = await conn.fetchval("SELECT COUNT(*) FROM avm.properties")
            sales = await conn.fetchval("SELECT COUNT(*) FROM avm.sales_history")
            min_date = await conn.fetchval("SELECT MIN(sale_date) FROM avm.sales_history")
            max_date = await conn.fetchval("SELECT MAX(sale_date) FROM avm.sales_history")

            # Breakdown by source type
            sales_count = await conn.fetchval(
                "SELECT COUNT(*) FROM avm.sales_history WHERE source = 'trestle_sale'"
            )
            lease_count = await conn.fetchval(
                "SELECT COUNT(*) FROM avm.sales_history WHERE source = 'trestle_lease'"
            )

        return {
            "properties_count": props,
            "sales_count": sales,
            "min_sale_date": min_date,
            "max_sale_date": max_date,
            "trestle_sales": sales_count or 0,
            "trestle_leases": lease_count or 0,
        }
