"""
Application configuration using Pydantic Settings
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # API Settings
    api_title: str = "GPR AVM API"
    api_version: str = "1.0.0"
    api_description: str = "Grand Prix Realty Automated Valuation Model API"
    debug: bool = False

    # Database
    database_url: str

    # CORS - allowed origins (comma-separated)
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://grandprix.re"

    # Rate Limiting
    rate_limit_public: int = 100  # requests per hour for unauthenticated
    rate_limit_auth: int = 1000  # requests per hour for authenticated

    # Environment
    environment: str = "development"

    # Model
    model_path: str = "models/avm_model.joblib"

    # Geocoding (optional - for address lookup)
    google_maps_api_key: Optional[str] = None

    # Supabase (for auth integration)
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
