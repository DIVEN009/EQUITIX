import { apiClient } from "./client";
import { useAuthStore } from "../store/authStore";
import {
  demoFetchPortfolios,
  demoCreatePortfolio,
  demoFetchPortfolioDetail,
  demoExecuteTransaction,
  demoDeletePortfolio,
} from "../services/demoPortfolioService";

export const fetchPortfoliosApi = async () => {
  if (useAuthStore.getState().isDemo) {
    return demoFetchPortfolios();
  }
  const response = await apiClient.get("/portfolios");
  return response.data;
};

export const createPortfolioApi = async ({ name, initial_cash }) => {
  if (useAuthStore.getState().isDemo) {
    return demoCreatePortfolio({ name, initial_cash });
  }
  const response = await apiClient.post("/portfolios", { name, initial_cash });
  return response.data;
};

export const fetchPortfolioDetailApi = async (portfolioId) => {
  if (useAuthStore.getState().isDemo) {
    return demoFetchPortfolioDetail(portfolioId);
  }
  const response = await apiClient.get(`/portfolios/${portfolioId}`);
  return response.data;
};

export const executeTransactionApi = async ({ portfolioId, ticker, action, shares, price }) => {
  if (useAuthStore.getState().isDemo) {
    return demoExecuteTransaction({ portfolioId, ticker, action, shares, price });
  }
  const response = await apiClient.post(`/portfolios/${portfolioId}/transactions`, {
    ticker,
    action,
    shares: Number(shares),
    price: Number(price),
  });
  return response.data;
};

export const deletePortfolioApi = async (portfolioId) => {
  if (useAuthStore.getState().isDemo) {
    return demoDeletePortfolio(portfolioId);
  }
  const response = await apiClient.delete(`/portfolios/${portfolioId}`);
  return response.data;
};
