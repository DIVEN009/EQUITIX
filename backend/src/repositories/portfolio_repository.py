from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from src.models.database_models import Portfolio, Holding


class PortfolioRepository:
    """
    Repository layer handling database operations for Portfolios and Holdings.
    """

    def get_user_portfolios(self, db: Session, user_id: UUID) -> List[Portfolio]:
        return (
            db.query(Portfolio)
            .filter(Portfolio.user_id == user_id)
            .order_by(Portfolio.created_at.desc())
            .all()
        )

    def get_portfolio_by_id(
        self,
        db: Session,
        portfolio_id: UUID,
        user_id: Optional[UUID] = None,
    ) -> Optional[Portfolio]:
        query = (
            db.query(Portfolio)
            .options(joinedload(Portfolio.holdings).joinedload(Holding.stock))
            .filter(Portfolio.id == portfolio_id)
        )
        if user_id is not None:
            query = query.filter(Portfolio.user_id == user_id)
        return query.first()

    def create_portfolio(
        self,
        db: Session,
        user_id: UUID,
        name: str,
        initial_cash: float = 10000.0,
    ) -> Portfolio:
        portfolio = Portfolio(
            user_id=user_id,
            name=name.strip(),
            cash_balance=round(initial_cash, 2),
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
        return portfolio

    def delete_portfolio(self, db: Session, portfolio: Portfolio) -> None:
        db.delete(portfolio)
        db.commit()

    def update_portfolio_cash(
        self,
        db: Session,
        portfolio: Portfolio,
        new_cash: float,
    ) -> Portfolio:
        portfolio.cash_balance = round(new_cash, 2)
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
        return portfolio

    def get_holding(
        self,
        db: Session,
        portfolio_id: UUID,
        ticker: str,
    ) -> Optional[Holding]:
        return (
            db.query(Holding)
            .filter(
                Holding.portfolio_id == portfolio_id,
                Holding.ticker == ticker.upper().strip(),
            )
            .first()
        )

    def create_holding(
        self,
        db: Session,
        portfolio_id: UUID,
        ticker: str,
        shares: float,
        average_price: float,
    ) -> Holding:
        holding = Holding(
            portfolio_id=portfolio_id,
            ticker=ticker.upper().strip(),
            shares=round(shares, 4),
            average_price=round(average_price, 2),
        )
        db.add(holding)
        db.commit()
        db.refresh(holding)
        return holding

    def update_holding(
        self,
        db: Session,
        holding: Holding,
        shares: float,
        average_price: float,
    ) -> Holding:
        holding.shares = round(shares, 4)
        holding.average_price = round(average_price, 2)
        db.add(holding)
        db.commit()
        db.refresh(holding)
        return holding

    def delete_holding(self, db: Session, holding: Holding) -> None:
        db.delete(holding)
        db.commit()


portfolio_repository = PortfolioRepository()
