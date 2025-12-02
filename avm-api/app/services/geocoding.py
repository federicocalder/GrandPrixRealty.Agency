"""
Geocoding service for address resolution
Uses Google Maps API or falls back to Nominatim (free)
"""

import re
from dataclasses import dataclass
from typing import Optional, Tuple

import httpx
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class GeocodingResult:
    """Result from geocoding an address"""

    latitude: float
    longitude: float
    formatted_address: str
    zip_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    street_number: Optional[str] = None
    street_name: Optional[str] = None
    unit_number: Optional[str] = None


def extract_unit_number(address: str) -> Tuple[str, Optional[str]]:
    """
    Extract unit number from address and return (clean_address, unit_number).

    Handles formats like:
    - "123 Main St #A" -> ("123 Main St", "A")
    - "123 Main St Unit 5" -> ("123 Main St", "5")
    - "123 Main St Apt 10" -> ("123 Main St", "10")
    - "123 Main St Suite 200" -> ("123 Main St", "200")
    - "123 Main St, #A, City, ST" -> ("123 Main St, City, ST", "A")
    """
    # Patterns to match unit numbers (order matters - more specific first)
    patterns = [
        # "#A" or "# A" format
        r'[,\s]*#\s*([A-Za-z0-9]+)(?=[,\s]|$)',
        # "Unit X" format
        r'[,\s]*(?:Unit|UNIT)\s+([A-Za-z0-9]+)(?=[,\s]|$)',
        # "Apt X" or "Apt. X" format
        r'[,\s]*(?:Apt\.?|APT\.?)\s+([A-Za-z0-9]+)(?=[,\s]|$)',
        # "Suite X" format
        r'[,\s]*(?:Suite|SUITE|Ste\.?|STE\.?)\s+([A-Za-z0-9]+)(?=[,\s]|$)',
    ]

    for pattern in patterns:
        match = re.search(pattern, address, re.IGNORECASE)
        if match:
            unit = match.group(1)
            # Remove the unit portion from address
            clean_address = re.sub(pattern, '', address, count=1, flags=re.IGNORECASE).strip()
            # Clean up any double commas or spaces
            clean_address = re.sub(r',\s*,', ',', clean_address)
            clean_address = re.sub(r'\s+', ' ', clean_address).strip(' ,')
            logger.debug("unit_extracted", original=address, clean=clean_address, unit=unit)
            return clean_address, unit

    return address, None


def insert_unit_into_address(formatted_address: str, unit: str) -> str:
    """
    Insert unit number back into a formatted address.

    Inserts after street name/number and before city.
    "123 Main St, City, ST 12345" -> "123 Main St #A, City, ST 12345"
    """
    parts = formatted_address.split(',')
    if len(parts) >= 2:
        # Insert unit after the street address
        parts[0] = f"{parts[0].strip()} #{unit}"
        return ', '.join(parts)
    # Fallback: just append
    return f"{formatted_address} #{unit}"


async def geocode_address(address: str) -> Optional[GeocodingResult]:
    """
    Geocode an address to coordinates.

    Handles unit numbers by:
    1. Extracting unit from address (Google doesn't geocode units well)
    2. Geocoding the base address
    3. Re-inserting unit into formatted address

    First tries Google Maps if API key is configured,
    falls back to Nominatim (OpenStreetMap) for free geocoding.

    Args:
        address: Full address string (may include unit number)

    Returns:
        GeocodingResult with coordinates, or None if not found
    """
    # Extract unit number if present
    clean_address, unit_number = extract_unit_number(address)

    if unit_number:
        logger.info("geocoding_with_unit", original=address, clean=clean_address, unit=unit_number)

    result = None

    if settings.google_maps_api_key:
        result = await _geocode_google(clean_address)

    if not result:
        # Fallback to Nominatim
        result = await _geocode_nominatim(clean_address)

    # If we extracted a unit number, add it back to the result
    if result and unit_number:
        result.unit_number = unit_number
        result.formatted_address = insert_unit_into_address(result.formatted_address, unit_number)
        logger.info("unit_reinserted", formatted_address=result.formatted_address)

    return result


async def _geocode_google(address: str) -> Optional[GeocodingResult]:
    """Geocode using Google Maps API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": settings.google_maps_api_key,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            if data["status"] != "OK" or not data["results"]:
                logger.warning("google_geocode_no_results", address=address)
                return None

            result = data["results"][0]
            location = result["geometry"]["location"]

            # Extract address components
            components = {c["types"][0]: c for c in result["address_components"]}

            return GeocodingResult(
                latitude=location["lat"],
                longitude=location["lng"],
                formatted_address=result["formatted_address"],
                zip_code=components.get("postal_code", {}).get("short_name"),
                city=components.get("locality", {}).get("long_name"),
                state=components.get("administrative_area_level_1", {}).get(
                    "short_name"
                ),
                street_number=components.get("street_number", {}).get("short_name"),
                street_name=components.get("route", {}).get("short_name"),
            )

    except Exception as e:
        logger.error("google_geocode_error", address=address, error=str(e))
        return None


async def _geocode_nominatim(address: str) -> Optional[GeocodingResult]:
    """Geocode using Nominatim (OpenStreetMap) - free but rate limited"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": address,
                    "format": "json",
                    "addressdetails": 1,
                    "limit": 1,
                },
                headers={
                    # Required by Nominatim usage policy
                    "User-Agent": "GPR-AVM/1.0 (contact@grandprix.re)",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            if not data:
                logger.warning("nominatim_geocode_no_results", address=address)
                return None

            result = data[0]
            addr = result.get("address", {})

            return GeocodingResult(
                latitude=float(result["lat"]),
                longitude=float(result["lon"]),
                formatted_address=result.get("display_name", address),
                zip_code=addr.get("postcode"),
                city=addr.get("city") or addr.get("town") or addr.get("village"),
                state=addr.get("state"),
                street_number=addr.get("house_number"),
                street_name=addr.get("road"),
            )

    except Exception as e:
        logger.error("nominatim_geocode_error", address=address, error=str(e))
        return None
