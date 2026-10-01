from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.api.deps import get_current_user
from src.core.database import get_db
from src.models.database_models import User
from src.schemas.portfolio_schema import (
    PortfolioCreate,
    TransactionCreate,
    PortfolioListItem,
    PortfolioSummaryResponse,
)
from src.services.portfolio_service import portfolio_service

router = APIRouter()


@router.get(
    "",
    response_model=List[PortfolioListItem],
    status_code=status.HTTP_200_OK,
    summary="List user portfolios",
    description="Retrieve all portfolios created by the authenticated user.",
)
def get_user_portfolios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[PortfolioListItem]:
    return portfolio_service.list_portfolios(db=db, user_id=current_user.id)


@router.post(
    "",
    response_model=PortfolioSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create portfolio",
    description="Create a new investment portfolio with virtual cash balance.",
)
def create_portfolio(
    portfolio_in: PortfolioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioSummaryResponse:
    return portfolio_service.create_portfolio(
        db=db,
        user_id=current_user.id,
        data=portfolio_in,
    )


@router.get(
    "/{portfolio_id}",
    response_model=PortfolioSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get portfolio details & P&L",
    description="Retrieve portfolio summary, active stock holdings, and real-time P&L analytics.",
)
def get_portfolio(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioSummaryResponse:
    return portfolio_service.get_portfolio_detail(
        db=db,
        portfolio_id=portfolio_id,
        user_id=current_user.id,
    )


@router.post(
    "/{portfolio_id}/transactions",
    response_model=PortfolioSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute transaction (Buy / Sell)",
    description="Execute simulated buy or sell of stock shares for the portfolio.",
)
def execute_transaction(
    portfolio_id: UUID,
    tx: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioSummaryResponse:
    return portfolio_service.execute_transaction(
        db=db,
        portfolio_id=portfolio_id,
        user_id=current_user.id,
        tx=tx,
    )


@router.delete(
    "/{portfolio_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete portfolio",
    description="Delete a portfolio and all associated holdings.",
)
def delete_portfolio(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return portfolio_service.delete_portfolio(
        db=db,
        portfolio_id=portfolio_id,
        user_id=current_user.id,
    )
