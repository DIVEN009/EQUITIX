import { useSettingsStore, SUPPORTED_CURRENCIES } from "../store/settingsStore";

export { SUPPORTED_CURRENCIES };

/**
 * Standard fallback exchange rates relative to USD (1 USD = X).
 * Rates will be replaced dynamically at runtime by live rates from the forex feed.
 */
export const DEFAULT_EXCHANGE_RATES = {
  USD: 1.0,
  INR: 96.28,
  EUR: 0.8935,
  GBP: 0.7567,
};

/**
 * Helper to get the most up-to-date live forex exchange rates from settingsStore.
 */
export const getLiveExchangeRates = () => {
  try {
    return useSettingsStore.getState().rates || DEFAULT_EXCHANGE_RATES;
  } catch {
    return DEFAULT_EXCHANGE_RATES;
  }
};

export const KNOWN_US_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META",
  "NFLX", "AMD", "INTC", "CRM", "ORCL", "CSCO", "ADBE", "QCOM",
  "TXN", "AVGO", "PYPL", "SQ", "COIN", "PLTR", "UBER", "ABNB",
  "DIS", "NKE", "BA", "IBM", "JPM", "V", "MA", "WMT", "KO", "PEP",
  "SPY", "QQQ", "DIA", "IWM", "VOO", "VTI"
]);

/**
 * Identify the native market currency of an equity ticker.
 * Indian NSE/BSE equities (.NS, .BO, or bare Indian tickers) are native INR.
 * European equities (.DE, .PA) are native EUR.
 * UK equities (.L) are native GBP.
 * Known US equities (AAPL, NVDA, MSFT, etc.) are native USD.
 */
export const getStockNativeCurrency = (ticker = "", explicitCurrency = null) => {
  if (explicitCurrency) return explicitCurrency.toUpperCase();
  if (!ticker) return "INR";
  const t = ticker.toUpperCase().trim();
  if (t.endsWith(".NS") || t.endsWith(".BO")) {
    return "INR";
  }
  if (t.endsWith(".DE") || t.endsWith(".PA") || t.endsWith(".AS")) {
    return "EUR";
  }
  if (t.endsWith(".L")) {
    return "GBP";
  }
  if (KNOWN_US_TICKERS.has(t)) {
    return "USD";
  }
  // Default bare tickers to INR (prevents Indian stocks like SJVN, NHPC, SAIL from converting to USD)
  return "INR";
};

/**
 * Convert numerical value from one currency to another using the live forex rates.
 */
export const convertCurrency = (val, fromCurrency = "INR", toCurrency = "INR") => {
  if (val === null || val === undefined || isNaN(Number(val))) return 0;
  const num = Number(val);
  if (fromCurrency === toCurrency) return num;

  const currentRates = getLiveExchangeRates();
  const fromRate = currentRates[fromCurrency] || 1.0;
  const toRate = currentRates[toCurrency] || 1.0;

  // Convert to USD base first, then into target currency
  const inUSD = num / fromRate;
  return inUSD * toRate;
};

/**
 * Format numeric value in a specified target currency with proper locale comma grouping.
 * Does NOT convert - formats the given number as-is with the target currency symbol.
 */
export const formatRawCurrency = (val, decimals = 2, currencyCode = null) => {
  const code = currencyCode || useSettingsStore.getState().currency || "INR";
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;

  if (val === null || val === undefined || isNaN(Number(val))) {
    return `${config.symbol}0.00`;
  }

  const num = Number(val);
  return `${config.symbol}${num.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format numeric value with AUTOMATIC conversion from fromCurrency into the user's active currency
 * using the live forex conversion chart rates.
 */
export const formatCurrency = (val, decimals = 2, fromCurrency = "INR") => {
  const targetCode = useSettingsStore.getState().currency || "INR";
  const converted = convertCurrency(val, fromCurrency, targetCode);
  return formatRawCurrency(converted, decimals, targetCode);
};

/**
 * Format large sums in compact notation based on active currency with live conversion.
 * For INR: Cr (Crore) and L (Lakh).
 * For USD/EUR/GBP: B (Billion) and M (Million).
 */
export const formatCurrencyCompact = (val, fromCurrency = "INR") => {
  const targetCode = useSettingsStore.getState().currency || "INR";
  const converted = convertCurrency(val, fromCurrency, targetCode);
  const config = SUPPORTED_CURRENCIES[targetCode] || SUPPORTED_CURRENCIES.INR;
  const symbol = config.symbol;

  if (targetCode === "INR") {
    if (Math.abs(converted) >= 10_000_000) {
      return `${symbol}${(converted / 10_000_000).toFixed(2)} Cr`;
    }
    if (Math.abs(converted) >= 100_000) {
      return `${symbol}${(converted / 100_000).toFixed(2)} L`;
    }
    if (Math.abs(converted) >= 1_000) {
      return `${symbol}${(converted / 1_000).toFixed(1)} K`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  }

  // Western grouping (USD, EUR, GBP)
  if (Math.abs(converted) >= 1_000_000_000) {
    return `${symbol}${(converted / 1_000_000_000).toFixed(2)} B`;
  }
  if (Math.abs(converted) >= 1_000_000) {
    return `${symbol}${(converted / 1_000_000).toFixed(2)} M`;
  }
  if (Math.abs(converted) >= 1_000) {
    return `${symbol}${(converted / 1_000).toFixed(1)} K`;
  }
  return `${symbol}${converted.toFixed(2)}`;
};

/**
 * React Hook for dynamic component reactivity when the user switches currency
 * or when live exchange rates refresh.
 */
export const useCurrency = () => {
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const rates = useSettingsStore((state) => state.rates);
  const lastUpdated = useSettingsStore((state) => state.lastUpdated);
  const isLoadingForex = useSettingsStore((state) => state.isLoadingForex);
  const fetchLiveForexRates = useSettingsStore((state) => state.fetchLiveForexRates);

  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;

  /**
   * Convert any numerical value from fromCurrency into the active user currency using live rates.
   */
  const convert = (val, fromCurrency = "INR") => {
    return convertCurrency(val, fromCurrency, currency);
  };

  /**
   * Format a general value, converting from fromCurrency (default INR) to active currency.
   */
  const format = (val, decimals = 2, fromCurrency = "INR") => {
    const converted = convertCurrency(val, fromCurrency, currency);
    return formatRawCurrency(converted, decimals, currency);
  };

  /**
   * Format a stock price, taking into account the ticker's native currency
   * and converting it into the active currency with live rates.
   */
  const formatStock = (val, ticker = "", decimals = 2, explicitCurrency = null) => {
    const native = getStockNativeCurrency(ticker, explicitCurrency);
    const converted = convertCurrency(val, native, currency);
    return formatRawCurrency(converted, decimals, currency);
  };

  /**
   * Format portfolio values (cash balance, total valuation, pnl)
   * where the base ledger is in baseCurrency (default INR) with live rates.
   */
  const formatPortfolio = (val, baseCurrency = "INR", decimals = 2) => {
    const converted = convertCurrency(val, baseCurrency, currency);
    return formatRawCurrency(converted, decimals, currency);
  };

  const formatCompact = (val, fromCurrency = "INR") => {
    return formatCurrencyCompact(val, fromCurrency);
  };

  return {
    currency,
    setCurrency,
    rates,
    lastUpdated,
    isLoadingForex,
    refreshRates: fetchLiveForexRates,
    symbol: config.symbol,
    config,
    convert,
    format,
    formatStock,
    formatPortfolio,
    formatCompact,
    formatRaw: (val, decimals = 2) => formatRawCurrency(val, decimals, currency),
  };
};

/**
 * Backward compatibility alias so existing calls automatically convert from INR base
 */
export const formatRupee = (val, decimals = 2, fromCurrency = "INR") => formatCurrency(val, decimals, fromCurrency);
export const formatRupeeCompact = (val, fromCurrency = "INR") => formatCurrencyCompact(val, fromCurrency);
export const CURRENCY_SYMBOL = "₹";
