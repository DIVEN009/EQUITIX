from fastapi import APIRouter
from src.api.v1.auth_router import router as auth_router
from src.api.v1.stock_router import router as stock_router
from src.api.v1.portfolio_router import router as portfolio_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(stock_router, prefix="/stocks", tags=["Stocks & Market Data"])
api_router.include_router(portfolio_router, prefix="/portfolios", tags=["Portfolios"])
