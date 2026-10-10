import math
from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.models.database_models import Portfolio, Holding
from src.repositories.portfolio_repository import PortfolioRepository, portfolio_repository
from src.repositories.stock_repository import StockRepository, stock_repository
from src.schemas.portfolio_schema import (
    PortfolioCreate,
    TransactionCreate,
    HoldingResponse,
    PortfolioListItem,
    PortfolioSummaryResponse,
)


class PortfolioService:
    """
    Service layer handling business logic for Portfolios, Holdings,
    Transactions (simulated Buy/Sell), and Real-time P&L analytics.
    """

    def __init__(
        self,
        portfolio_repo: PortfolioRepository = portfolio_repository,
        stock_repo: StockRepository = stock_repository,
    ):
        self.portfolio_repo = portfolio_repo
        self.stock_repo = stock_repo

    def list_portfolios(self, db: Session, user_id: UUID) -> List[PortfolioListItem]:
        """
        List all portfolios belonging to a specific user.
        """
        portfolios = self.portfolio_repo.get_user_portfolios(db, user_id=user_id)
        return [
            PortfolioListItem(
                id=p.id,
                name=p.name,
                cash_balance=float(p.cash_balance),
                holdings_count=len(p.holdings) if p.holdings else 0,
                created_at=p.created_at,
            )
            for p in portfolios
        ]

    def create_portfolio(
        self,
        db: Session,
        user_id: UUID,
        data: PortfolioCreate,
    ) -> PortfolioSummaryResponse:
        """
        Create a new portfolio with an initial cash allocation.
        """
        portfolio = self.portfolio_repo.create_portfolio(
            db=db,
            user_id=user_id,
            name=data.name,
            initial_cash=data.initial_cash,
        )
        return self.get_portfolio_detail(db, portfolio_id=portfolio.id, user_id=user_id)

    def get_portfolio_detail(
        self,
        db: Session,
        portfolio_id: UUID,
        user_id: UUID,
    ) -> PortfolioSummaryResponse:
        """
        Compute real-time summary for a portfolio, including holdings,
        current market prices, unrealized profit & loss, and percentage return.
        """
        portfolio = self.portfolio_repo.get_portfolio_by_id(db, portfolio_id=portfolio_id, user_id=user_id)
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found or access denied.",
            )

        holdings_responses: List[HoldingResponse] = []
        total_holdings_value = 0.0
        total_invested_value = 0.0

        for holding in portfolio.holdings:
            ticker = holding.ticker
            shares = float(holding.shares)
            avg_price = float(holding.average_price)

            # Determine latest price from DailyPrice or fallback to average price
            latest_price_rec = self.stock_repo.get_latest_daily_price(db, ticker)
            raw_close = None
            if latest_price_rec and latest_price_rec.close is not None:
                try:
                    c = float(latest_price_rec.close)
                    if not math.isnan(c) and c > 0:
                        raw_close = c
                except (ValueError, TypeError):
                    pass

            if raw_close is not None:
                current_price = raw_close
            elif avg_price > 0 and not math.isnan(avg_price):
                current_price = avg_price
            else:
                current_price = 1.0

            invested_val = round(shares * avg_price, 2)
            current_val = round(shares * current_price, 2)
            unrealized_pnl = round(current_val - invested_val, 2)
            unrealized_pnl_pct = (
                round((unrealized_pnl / invested_val) * 100, 2)
                if invested_val > 0 and not math.isnan(unrealized_pnl)
                else 0.0
            )
            if math.isnan(unrealized_pnl_pct):
                unrealized_pnl_pct = 0.0

            total_holdings_value += current_val
            total_invested_value += invested_val

            company_name = holding.stock.company_name if (holding.stock and holding.stock.company_name) else ticker

            holdings_responses.append(
                HoldingResponse(
                    id=holding.id,
                    ticker=ticker,
                    company_name=company_name,
                    shares=shares,
                    average_price=avg_price,
                    current_price=current_price,
                    invested_value=invested_val,
                    current_value=current_val,
                    unrealized_pnl=unrealized_pnl,
                    unrealized_pnl_percent=unrealized_pnl_pct,
                )
            )

        cash_balance = float(portfolio.cash_balance)
        total_portfolio_value = round(cash_balance + total_holdings_value, 2)
        total_unrealized_pnl = round(total_holdings_value - total_invested_value, 2)
        total_pnl_percent = (
            round((total_unrealized_pnl / total_invested_value) * 100, 2)
            if total_invested_value > 0 and not math.isnan(total_unrealized_pnl)
            else 0.0
        )
        if math.isnan(total_pnl_percent):
            total_pnl_percent = 0.0

        return PortfolioSummaryResponse(
            id=portfolio.id,
            user_id=portfolio.user_id,
            name=portfolio.name,
            cash_balance=cash_balance,
            holdings_value=round(total_holdings_value, 2),
            total_value=total_portfolio_value,
            total_invested=round(total_invested_value, 2),
            total_unrealized_pnl=total_unrealized_pnl,
            total_unrealized_pnl_percent=total_pnl_percent,
            created_at=portfolio.created_at,
            holdings=holdings_responses,
        )

    def execute_transaction(
        self,
        db: Session,
        portfolio_id: UUID,
        user_id: UUID,
        tx: TransactionCreate,
    ) -> PortfolioSummaryResponse:
        """
        Execute simulated Buy or Sell transaction for a portfolio.
        Enforces cash sufficiency and holding balance checks.
        """
        portfolio = self.portfolio_repo.get_portfolio_by_id(db, portfolio_id=portfolio_id, user_id=user_id)
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found or access denied.",
            )

        ticker = tx.ticker.upper().strip()

        # Ensure stock exists in DB so foreign key constraint is satisfied
        stock = self.stock_repo.get_stock(db, ticker)
        if not stock:
            self.stock_repo.upsert_stock(db, ticker=ticker, company_name=ticker)

        if tx.action == "BUY":
            total_cost = round(tx.shares * tx.price, 2)
            current_cash = float(portfolio.cash_balance)
            if current_cash < total_cost:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient cash balance. Available: ${current_cash:.2f}, Required: ${total_cost:.2f}",
                )

            # Deduct cash
            new_cash = current_cash - total_cost
            self.portfolio_repo.update_portfolio_cash(db, portfolio, new_cash)

            # Update or create holding
            existing_holding = self.portfolio_repo.get_holding(db, portfolio_id, ticker)
            if existing_holding:
                old_shares = float(existing_holding.shares)
                old_cost = old_shares * float(existing_holding.average_price)
                new_shares = old_shares + tx.shares
                new_average_price = (old_cost + total_cost) / new_shares
                self.portfolio_repo.update_holding(db, existing_holding, new_shares, new_average_price)
            else:
                self.portfolio_repo.create_holding(
                    db=db,
                    portfolio_id=portfolio_id,
                    ticker=ticker,
                    shares=tx.shares,
                    average_price=tx.price,
                )

        elif tx.action == "SELL":
            existing_holding = self.portfolio_repo.get_holding(db, portfolio_id, ticker)
            if not existing_holding or float(existing_holding.shares) < tx.shares:
                available_shares = float(existing_holding.shares) if existing_holding else 0.0
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient shares to sell. Available: {available_shares}, Requested: {tx.shares}",
                )

            total_proceeds = round(tx.shares * tx.price, 2)
            new_cash = float(portfolio.cash_balance) + total_proceeds
            self.portfolio_repo.update_portfolio_cash(db, portfolio, new_cash)

            remaining_shares = float(existing_holding.shares) - tx.shares
            if remaining_shares <= 0.00001:
                self.portfolio_repo.delete_holding(db, existing_holding)
            else:
                self.portfolio_repo.update_holding(
                    db=db,
                    holding=existing_holding,
                    shares=remaining_shares,
                    average_price=float(existing_holding.average_price),
                )

        return self.get_portfolio_detail(db, portfolio_id=portfolio_id, user_id=user_id)

    def delete_portfolio(
        self,
        db: Session,
        portfolio_id: UUID,
        user_id: UUID,
    ) -> dict:
        """
        Delete a portfolio by ID.
        """
        portfolio = self.portfolio_repo.get_portfolio_by_id(db, portfolio_id=portfolio_id, user_id=user_id)
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found or access denied.",
            )

        self.portfolio_repo.delete_portfolio(db, portfolio)
        return {"detail": "Portfolio successfully deleted", "id": str(portfolio_id)}


portfolio_service = PortfolioService()
