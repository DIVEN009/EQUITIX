import { apiClient } from "./client";

export const fetchPortfoliosApi = async () => {
  const response = await apiClient.get("/portfolios");
  return response.data;
};

export const createPortfolioApi = async ({ name, initial_cash }) => {
  const response = await apiClient.post("/portfolios", { name, initial_cash });
  return response.data;
};

export const fetchPortfolioDetailApi = async (portfolioId) => {
  const response = await apiClient.get(`/portfolios/${portfolioId}`);
  return response.data;
};

export const executeTransactionApi = async ({ portfolioId, ticker, action, shares, price }) => {
  const response = await apiClient.post(`/portfolios/${portfolioId}/transactions`, {
    ticker,
    action,
    shares: Number(shares),
    price: Number(price),
  });
  return response.data;
};

export const deletePortfolioApi = async (portfolioId) => {
  const response = await apiClient.delete(`/portfolios/${portfolioId}`);
  return response.data;
};
