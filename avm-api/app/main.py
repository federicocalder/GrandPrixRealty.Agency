"""
GPR AVM API - Automated Valuation Model for Las Vegas Real Estate

FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import get_settings
from app.core.database import engine
from app.routers import valuations_router, leads_router
from app.models.schemas import HealthResponse
from app.services.model_loader import load_model, is_model_loaded, get_model_version

settings = get_settings()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("avm_api_starting", environment=settings.environment)

    # Load ML model at startup
    model_loaded = load_model()
    if model_loaded:
        logger.info("ml_model_ready", version=get_model_version())
    else:
        logger.warning("ml_model_not_loaded", fallback="comparable-based")

    yield

    # Cleanup
    await engine.dispose()
    logger.info("avm_api_shutdown")


# Create FastAPI app
app = FastAPI(
    title="GPR AVM API",
    description="Automated Valuation Model API for Las Vegas residential real estate",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(valuations_router)
app.include_router(leads_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint for load balancers and monitoring.
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        model_loaded=is_model_loaded(),
    )


@app.get("/", tags=["system"])
async def root():
    """API root - redirect to docs or return info"""
    return {
        "name": "GPR AVM API",
        "version": "1.0.0",
        "description": "Automated Valuation Model for Las Vegas Real Estate",
        "model_version": get_model_version() if is_model_loaded() else "not loaded",
        "docs": "/docs",
        "health": "/health",
    }
