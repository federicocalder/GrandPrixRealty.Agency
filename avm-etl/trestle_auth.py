"""
Trestle API OAuth Authentication
Handles token acquisition and caching with automatic refresh
"""

import time
from dataclasses import dataclass
from typing import Optional

import httpx
import structlog

from config import TrestleConfig

logger = structlog.get_logger()


@dataclass
class CachedToken:
    """Cached OAuth token with expiry tracking"""
    access_token: str
    expires_at: float  # Unix timestamp


class TrestleAuth:
    """
    Trestle API OAuth2 Client Credentials authenticator.
    Automatically caches and refreshes tokens.
    """

    def __init__(self, config: TrestleConfig):
        self.config = config
        self._cached_token: Optional[CachedToken] = None
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=30.0,
                http2=True,
            )
        return self._http_client

    async def get_token(self) -> str:
        """
        Get a valid access token, refreshing if necessary.
        Returns cached token if still valid (with 60s buffer).
        """
        # Check if cached token is still valid
        if self._cached_token:
            if time.time() < self._cached_token.expires_at:
                return self._cached_token.access_token
            else:
                logger.info("token_expired", message="Cached token expired, refreshing")

        # Request new token
        logger.info("token_request", message="Requesting new OAuth token")

        client = await self._get_client()

        try:
            response = await client.post(
                self.config.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            response.raise_for_status()

            data = response.json()

            # Cache token with 60 second safety buffer
            expires_in = data.get("expires_in", 3600)
            self._cached_token = CachedToken(
                access_token=data["access_token"],
                expires_at=time.time() + expires_in - 60,
            )

            logger.info(
                "token_acquired",
                expires_in=expires_in,
                message=f"Token acquired, valid for {expires_in}s"
            )

            return self._cached_token.access_token

        except httpx.HTTPStatusError as e:
            logger.error(
                "token_request_failed",
                status_code=e.response.status_code,
                response=e.response.text,
            )
            raise
        except Exception as e:
            logger.error("token_request_error", error=str(e))
            raise

    async def close(self):
        """Close HTTP client"""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
