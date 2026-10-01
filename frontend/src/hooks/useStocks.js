import { useQuery } from "@tanstack/react-query";
import {
  fetchStockQuoteApi,
  fetchStockHistoryApi,
  searchStocksApi,
  fetchStockPredictionsApi,
} from "../api/stocks";

/**
 * Hook to retrieve live quote and basic summary for a given ticker.
 * @param {string} ticker
 */
export const useStockQuote = (ticker) => {
  const normalizedTicker = ticker?.toUpperCase()?.trim();

  return useQuery({
    queryKey: ["stockQuote", normalizedTicker],
    queryFn: () => fetchStockQuoteApi(normalizedTicker),
    enabled: Boolean(normalizedTicker),
    staleTime: 1000 * 30, // 30 seconds fresh
    refetchInterval: 1000 * 60, // Auto-refresh quote every minute
    retry: 1,
  });
};

/**
 * Hook to retrieve time-series OHLCV history data for interactive charting.
 * @param {string} ticker
 * @param {number} days
 */
export const useStockHistory = (ticker, days = 30) => {
  const normalizedTicker = ticker?.toUpperCase()?.trim();

  return useQuery({
    queryKey: ["stockHistory", normalizedTicker, days],
    queryFn: () => fetchStockHistoryApi(normalizedTicker, days),
    enabled: Boolean(normalizedTicker),
    staleTime: 1000 * 60 * 3, // 3 minutes fresh
    retry: 1,
  });
};

/**
 * Hook to execute autocomplete search across tracked stocks.
 * @param {string} query
 */
export const useStockSearch = (query) => {
  const trimmed = query?.trim();

  return useQuery({
    queryKey: ["stockSearch", trimmed],
    queryFn: () => searchStocksApi(trimmed),
    enabled: Boolean(trimmed && trimmed.length >= 1),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to retrieve 7-day predictive machine learning forecasts.
 * @param {string} ticker
 */
export const useStockPredictions = (ticker) => {
  const normalizedTicker = ticker?.toUpperCase()?.trim();

  return useQuery({
    queryKey: ["stockPredictions", normalizedTicker],
    queryFn: () => fetchStockPredictionsApi(normalizedTicker),
    enabled: Boolean(normalizedTicker),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
};
