"""
Lead capture API endpoints
"""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.database import get_db
from app.models.schemas import LeadCreateRequest, LeadResponse

logger = structlog.get_logger()
router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("", response_model=LeadResponse)
async def create_lead(
    request: LeadCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> LeadResponse:
    """
    Capture a lead before releasing full valuation report.

    This is the gate that converts anonymous valuations into leads.
    """
    lead_id = f"lead_{uuid4().hex[:12]}"

    logger.info(
        "lead_capture",
        lead_id=lead_id,
        valuation_id=request.valuation_id,
        email=request.email[:3] + "***",  # Mask email in logs
        lead_type=request.lead_type,
    )

    # Insert lead into database
    try:
        query = text("""
            INSERT INTO app.leads (
                id, email, phone, first_name, last_name,
                source, lead_type, property_address, valuation_id,
                status
            ) VALUES (
                :id::uuid, :email, :phone, :first_name, :last_name,
                'avm', :lead_type, :property_address, :valuation_id,
                'new'
            )
            RETURNING id
        """)

        # We need to look up the property address from the valuation
        # For now, we'll leave it null - TODO: implement valuation storage

        await db.execute(
            query,
            {
                "id": lead_id.replace("lead_", ""),  # Remove prefix for UUID
                "email": request.email,
                "phone": request.phone,
                "first_name": request.first_name,
                "last_name": request.last_name,
                "lead_type": request.lead_type,
                "property_address": None,  # TODO: lookup from valuation
                "valuation_id": request.valuation_id,
            },
        )
        await db.commit()

        logger.info("lead_created", lead_id=lead_id)

    except Exception as e:
        logger.error("lead_create_error", error=str(e))
        await db.rollback()

        # Check if it's a duplicate email error
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail="This email has already been used. Check your inbox for the report.",
            )
        raise HTTPException(
            status_code=500,
            detail="Error creating lead. Please try again.",
        )

    # Generate report URL with token
    report_url = f"/valuations/{request.valuation_id}/report?token={uuid4().hex[:16]}"

    return LeadResponse(
        lead_id=lead_id,
        report_url=report_url,
        message="Your report is ready! Check your email for a copy.",
    )


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get lead details (for internal/admin use).

    TODO: Add authentication for this endpoint
    """
    raise HTTPException(
        status_code=403,
        detail="This endpoint requires authentication",
    )
