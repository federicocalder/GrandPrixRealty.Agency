"""
Trestle API Client for Historical Sales Data
Fetches closed sales with pagination support for bulk loading
"""

import asyncio
from dataclasses import dataclass
from datetime import date
from typing import Any, AsyncGenerator, Optional
from urllib.parse import urlencode

import httpx
import structlog

from config import TrestleConfig, ETLConfig
from trestle_auth import TrestleAuth

logger = structlog.get_logger()


@dataclass
class ClosedSale:
    """Represents a closed sale record from Trestle"""
    # Identification
    listing_key: str
    listing_id: str

    # Sale Details
    close_price: Optional[float]
    close_date: Optional[date]
    list_price: Optional[float]
    original_list_price: Optional[float]
    days_on_market: Optional[int]

    # Location
    street_number: Optional[str]
    street_name: Optional[str]
    street_suffix: Optional[str]
    unit_number: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    county: Optional[str]
    subdivision: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]

    # Property Characteristics
    property_type: Optional[str]  # Residential, ResidentialLease, etc.
    property_sub_type: Optional[str]  # SingleFamilyResidence, Condominium, etc.
    beds: Optional[int]
    baths_full: Optional[int]
    baths_half: Optional[int]
    baths_total: Optional[int]
    sqft_living: Optional[int]
    sqft_lot: Optional[int]
    year_built: Optional[int]
    stories: Optional[int]
    garage_spaces: Optional[int]
    pool: Optional[bool]

    # Transaction type derived from PropertyType
    # 'sale' = Residential, 'lease' = ResidentialLease
    transaction_type: str

    # Raw data for debugging
    raw: dict


# Fields to request from Trestle API for closed sales
CLOSED_SALE_FIELDS = [
    # Identification
    "ListingKey",
    "ListingId",

    # Sale/Price Details
    "ClosePrice",
    "CloseDate",
    "ListPrice",
    "OriginalListPrice",
    "DaysOnMarket",
    "StandardStatus",

    # Location
    "StreetNumber",
    "StreetName",
    "StreetSuffix",
    "UnitNumber",
    "City",
    "StateOrProvince",
    "PostalCode",
    "CountyOrParish",
    "SubdivisionName",
    "Latitude",
    "Longitude",

    # Property Characteristics
    "PropertyType",
    "PropertySubType",
    "BedroomsTotal",
    "BathroomsFull",
    "BathroomsHalf",
    "BathroomsTotalInteger",
    "LivingArea",
    "LotSizeSquareFeet",
    "YearBuilt",
    "Stories",
    "GarageSpaces",
    "PoolPrivateYN",
]


def parse_date(value: Any) -> Optional[date]:
    """Parse date from Trestle API response"""
    if not value:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        # Handle ISO format: 2024-01-15T00:00:00Z
        try:
            return date.fromisoformat(value.split("T")[0])
        except ValueError:
            return None
    return None


def parse_int(value: Any) -> Optional[int]:
    """Parse integer from API response"""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_float(value: Any) -> Optional[float]:
    """Parse float from API response"""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_bool(value: Any) -> Optional[bool]:
    """Parse boolean from API response"""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "yes", "1")
    return bool(value)


def determine_transaction_type(property_type: Optional[str]) -> str:
    """
    Determine if this is a sale or lease based on PropertyType.

    PropertyType values:
    - 'Residential' -> sale
    - 'ResidentialLease' -> lease
    - 'Land' -> sale
    - 'ResidentialIncome' -> sale (multi-family)
    - 'Commercial' -> sale
    - 'CommercialLease' -> lease
    """
    if property_type and 'Lease' in property_type:
        return 'lease'
    return 'sale'


def record_to_closed_sale(record: dict) -> ClosedSale:
    """Convert raw API record to ClosedSale dataclass"""
    property_type = record.get("PropertyType")

    return ClosedSale(
        listing_key=record.get("ListingKey", ""),
        listing_id=record.get("ListingId", ""),

        close_price=parse_float(record.get("ClosePrice")),
        close_date=parse_date(record.get("CloseDate")),
        list_price=parse_float(record.get("ListPrice")),
        original_list_price=parse_float(record.get("OriginalListPrice")),
        days_on_market=parse_int(record.get("DaysOnMarket")),

        street_number=record.get("StreetNumber"),
        street_name=record.get("StreetName"),
        street_suffix=record.get("StreetSuffix"),
        unit_number=record.get("UnitNumber"),
        city=record.get("City"),
        state=record.get("StateOrProvince"),
        postal_code=record.get("PostalCode"),
        county=record.get("CountyOrParish"),
        subdivision=record.get("SubdivisionName"),
        latitude=parse_float(record.get("Latitude")),
        longitude=parse_float(record.get("Longitude")),

        property_type=property_type,
        property_sub_type=record.get("PropertySubType"),
        beds=parse_int(record.get("BedroomsTotal")),
        baths_full=parse_int(record.get("BathroomsFull")),
        baths_half=parse_int(record.get("BathroomsHalf")),
        baths_total=parse_int(record.get("BathroomsTotalInteger")),
        sqft_living=parse_int(record.get("LivingArea")),
        sqft_lot=parse_int(record.get("LotSizeSquareFeet")),
        year_built=parse_int(record.get("YearBuilt")),
        stories=parse_int(record.get("Stories")),
        garage_spaces=parse_int(record.get("GarageSpaces")),
        pool=parse_bool(record.get("PoolPrivateYN")),

        transaction_type=determine_transaction_type(property_type),
        raw=record,
    )


class TrestleClient:
    """
    Trestle API client for fetching closed sales data.
    Supports pagination and date range filtering.
    """

    def __init__(self, trestle_config: TrestleConfig, etl_config: ETLConfig):
        self.config = trestle_config
        self.etl_config = etl_config
        self.auth = TrestleAuth(trestle_config)
        self._http_client: Optional[httpx.AsyncClient] = None

        # Rate limiting
        self._request_times: list[float] = []
        self._rate_limit = etl_config.rate_limit

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=60.0,
                http2=True,
            )
        return self._http_client

    async def _rate_limit_wait(self):
        """Wait if necessary to respect rate limits"""
        import time as time_module

        now = time_module.time()

        # Remove requests older than 1 minute
        self._request_times = [t for t in self._request_times if now - t < 60]

        if len(self._request_times) >= self._rate_limit:
            # Wait until the oldest request is 1 minute old
            wait_time = 60 - (now - self._request_times[0])
            if wait_time > 0:
                logger.debug("rate_limit_wait", seconds=wait_time)
                await asyncio.sleep(wait_time)

        self._request_times.append(time_module.time())

    def _build_filter(
        self,
        start_date: date,
        end_date: date,
        skip: int = 0,
    ) -> str:
        """
        Build OData filter for closed sales in date range.

        Filters:
        - StandardStatus eq 'Closed'
        - StateOrProvince eq 'NV'
        - CloseDate between start and end
        """
        filters = [
            "StandardStatus eq 'Closed'",
            f"StateOrProvince eq '{self.etl_config.state}'",
            f"CloseDate ge {start_date.isoformat()}",
            f"CloseDate le {end_date.isoformat()}",
        ]
        return " and ".join(filters)

    async def fetch_page(
        self,
        start_date: date,
        end_date: date,
        skip: int = 0,
        top: int = 500,
    ) -> tuple[list[dict], Optional[str]]:
        """
        Fetch a single page of closed sales.

        Returns:
            Tuple of (records, next_link)
            next_link is None if no more pages
        """
        await self._rate_limit_wait()

        token = await self.auth.get_token()
        client = await self._get_client()

        # Build OData query
        filter_str = self._build_filter(start_date, end_date)

        params = {
            "$filter": filter_str,
            "$select": ",".join(CLOSED_SALE_FIELDS),
            "$orderby": "CloseDate asc,ListingKey asc",
            "$top": str(top),
            "$skip": str(skip),
            "$count": "true",  # Include total count
        }

        url = f"{self.config.odata_url}?{urlencode(params)}"

        logger.debug(
            "fetch_page",
            start_date=str(start_date),
            end_date=str(end_date),
            skip=skip,
            top=top,
        )

        try:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()

            data = response.json()
            records = data.get("value", [])
            total_count = data.get("@odata.count")
            next_link = data.get("@odata.nextLink")

            logger.info(
                "page_fetched",
                records=len(records),
                total_count=total_count,
                skip=skip,
                has_next=next_link is not None,
            )

            return records, next_link

        except httpx.HTTPStatusError as e:
            logger.error(
                "fetch_error",
                status_code=e.response.status_code,
                response=e.response.text[:500],
                skip=skip,
            )
            raise
        except Exception as e:
            logger.error("fetch_exception", error=str(e), skip=skip)
            raise

    async def fetch_closed_sales(
        self,
        start_date: date,
        end_date: date,
    ) -> AsyncGenerator[ClosedSale, None]:
        """
        Fetch all closed sales in date range with automatic pagination.

        Yields ClosedSale objects one at a time for memory efficiency.
        """
        skip = 0
        batch_size = self.etl_config.batch_size

        logger.info(
            "fetch_closed_sales_start",
            start_date=str(start_date),
            end_date=str(end_date),
            batch_size=batch_size,
        )

        total_fetched = 0

        while True:
            records, next_link = await self.fetch_page(
                start_date=start_date,
                end_date=end_date,
                skip=skip,
                top=batch_size,
            )

            for record in records:
                yield record_to_closed_sale(record)
                total_fetched += 1

            # Check if we should continue
            if len(records) < batch_size:
                # Last page (incomplete)
                break

            if next_link is None:
                # No more pages
                break

            skip += batch_size

        logger.info("fetch_closed_sales_complete", total_records=total_fetched)

    async def get_count(self, start_date: date, end_date: date) -> int:
        """Get total count of closed sales in date range (without fetching data)"""
        await self._rate_limit_wait()

        token = await self.auth.get_token()
        client = await self._get_client()

        filter_str = self._build_filter(start_date, end_date)

        params = {
            "$filter": filter_str,
            "$count": "true",
            "$top": "0",  # Don't fetch any records, just count
        }

        url = f"{self.config.odata_url}?{urlencode(params)}"

        try:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
            )
            response.raise_for_status()

            data = response.json()
            count = data.get("@odata.count", 0)

            logger.info(
                "count_fetched",
                start_date=str(start_date),
                end_date=str(end_date),
                count=count,
            )

            return count

        except Exception as e:
            logger.error("count_error", error=str(e))
            raise

    async def close(self):
        """Close HTTP clients"""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
        await self.auth.close()
