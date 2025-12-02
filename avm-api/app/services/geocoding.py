"""
Geocoding service for address resolution
Uses Google Maps API or falls back to Nominatim (free)
"""

from dataclasses import dataclass
from typing import Optional

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


async def geocode_address(address: str) -> Optional[GeocodingResult]:
    """
    Geocode an address to coordinates.

    First tries Google Maps if API key is configured,
    falls back to Nominatim (OpenStreetMap) for free geocoding.

    Args:
        address: Full address string

    Returns:
        GeocodingResult with coordinates, or None if not found
    """
    if settings.google_maps_api_key:
        result = await _geocode_google(address)
        if result:
            return result

    # Fallback to Nominatim
    return await _geocode_nominatim(address)


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
