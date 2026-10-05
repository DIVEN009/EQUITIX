import { apiClient } from "./client";

/**
 * Fetch real-time stock quote and metadata.
 * Uses 1.5s timeout on backend with automatic DB cache fallback.
 * @param {string} ticker - e.g. "AAPL"
 */
export const fetchStockQuoteApi = async (ticker) => {
  if (!ticker) throw new Error("Ticker is required");
  const response = await apiClient.get(`/stocks/${ticker.toUpperCase()}`);
  return response.data;
};

/**
 * Fetch time-series OHLCV history data for charting.
 * @param {string} ticker - e.g. "AAPL"
 * @param {number} days - Lookback window in calendar days (5 to 1825)
 */
export const fetchStockHistoryApi = async (ticker, days = 30) => {
  if (!ticker) throw new Error("Ticker is required");
  const response = await apiClient.get(`/stocks/${ticker.toUpperCase()}/history`, {
    params: { days },
  });
  return response.data;
};

/**
 * Search stocks and companies by symbol or name.
 * @param {string} query - Keyword search
 */
export const searchStocksApi = async (query) => {
  if (!query || !query.trim()) return [];
  const response = await apiClient.get("/stocks/search", {
    params: { q: query.trim() },
  });
  return response.data;
};

/**
 * Dynamically resolve any company name, brand, or bare ticker to its canonical exchange symbol.
 * @param {string} query
 */
export const resolveStockApi = async (query) => {
  if (!query || !query.trim()) return null;
  const response = await apiClient.get("/stocks/resolve", {
    params: { q: query.trim() },
  });
  return response.data;
};

/**
 * Fetch ML forecast predictions for the ticker (LSTM & Linear Regression).
 * @param {string} ticker - e.g. "AAPL"
 */
export const fetchStockPredictionsApi = async (ticker) => {
  if (!ticker) throw new Error("Ticker is required");
  const response = await apiClient.get(`/stocks/${ticker.toUpperCase()}/predictions`);
  return response.data;
};

/**
 * Fetch ML model validation benchmarks (RMSE, Directional Accuracy, sample sizes).
 * @param {string} ticker - e.g. "AAPL"
 */
export const fetchStockBenchmarksApi = async (ticker) => {
  if (!ticker) throw new Error("Ticker is required");
  const response = await apiClient.get(`/stocks/${ticker.toUpperCase()}/benchmarks`);
  return response.data;
};

