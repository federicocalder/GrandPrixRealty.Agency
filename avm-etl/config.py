"""
GPR AVM ETL Configuration
Loads environment variables and provides typed configuration
"""

import os
from dataclasses import dataclass
from datetime import date, datetime
from dotenv import load_dotenv

load_dotenv()


@dataclass
class TrestleConfig:
    """Trestle API configuration"""
    client_id: str
    client_secret: str
    token_url: str
    odata_url: str


@dataclass
class DatabaseConfig:
    """Database configuration"""
    url: str


@dataclass
class ETLConfig:
    """ETL process configuration"""
    start_date: date
    end_date: date
    batch_size: int
    rate_limit: int  # requests per minute
    state: str
    resume: bool


def get_trestle_config() -> TrestleConfig:
    """Load Trestle API configuration from environment"""
    return TrestleConfig(
        client_id=os.environ["TRESTLE_CLIENT_ID"],
        client_secret=os.environ["TRESTLE_CLIENT_SECRET"],
        token_url=os.environ.get(
            "TRESTLE_TOKEN_URL",
            "https://api.cotality.com/trestle/oidc/connect/token"
        ),
        odata_url=os.environ.get(
            "TRESTLE_ODATA_URL",
            "https://api.cotality.com/trestle/odata/Property"
        ),
    )


def get_database_config() -> DatabaseConfig:
    """Load database configuration from environment"""
    return DatabaseConfig(
        url=os.environ["DATABASE_URL"]
    )


def get_etl_config() -> ETLConfig:
    """Load ETL process configuration from environment"""
    start_str = os.environ.get("ETL_START_DATE", "2013-01-01")
    end_str = os.environ.get("ETL_END_DATE", "")

    start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
    end_date = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else date.today()

    return ETLConfig(
        start_date=start_date,
        end_date=end_date,
        batch_size=int(os.environ.get("ETL_BATCH_SIZE", "500")),
        rate_limit=int(os.environ.get("ETL_RATE_LIMIT", "30")),
        state=os.environ.get("ETL_STATE", "NV"),
        resume=os.environ.get("ETL_RESUME", "true").lower() == "true",
    )
