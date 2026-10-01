import { useSettingsStore, SUPPORTED_CURRENCIES } from "../store/settingsStore";

export { SUPPORTED_CURRENCIES };

/**
 * Format numeric value in the active user currency with proper locale comma grouping.
 * @param {number|string} val
 * @param {number} decimals
 * @param {string|null} currencyCode - Optional override (INR, USD, EUR, GBP)
 */
export const formatCurrency = (val, decimals = 2, currencyCode = null) => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    const code = currencyCode || useSettingsStore.getState().currency || "INR";
    const symbol = SUPPORTED_CURRENCIES[code]?.symbol || "₹";
    return `${symbol}0.00`;
  }

  const code = currencyCode || useSettingsStore.getState().currency || "INR";
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;
  const num = Number(val);

  return `${config.symbol}${num.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format large sums in compact notation based on active currency.
 * For INR: Cr (Crore) and L (Lakh).
 * For USD/EUR/GBP: B (Billion) and M (Million).
 */
export const formatCurrencyCompact = (val, currencyCode = null) => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    const code = currencyCode || useSettingsStore.getState().currency || "INR";
    return `${SUPPORTED_CURRENCIES[code]?.symbol || "₹"}0`;
  }

  const code = currencyCode || useSettingsStore.getState().currency || "INR";
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;
  const num = Number(val);
  const symbol = config.symbol;

  if (code === "INR") {
    if (Math.abs(num) >= 10_000_000) {
      return `${symbol}${(num / 10_000_000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100_000) {
      return `${symbol}${(num / 100_000).toFixed(2)} L`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${symbol}${(num / 1_000).toFixed(1)} K`;
    }
    return `${symbol}${num.toFixed(2)}`;
  }

  // Western grouping (USD, EUR, GBP)
  if (Math.abs(num) >= 1_000_000_000) {
    return `${symbol}${(num / 1_000_000_000).toFixed(2)} B`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${symbol}${(num / 1_000_000).toFixed(2)} M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${symbol}${(num / 1_000).toFixed(1)} K`;
  }
  return `${symbol}${num.toFixed(2)}`;
};

/**
 * React Hook for dynamic component reactivity when the user switches currency
 */
export const useCurrency = () => {
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;

  const format = (val, decimals = 2) => formatCurrency(val, decimals, currency);
  const formatCompact = (val) => formatCurrencyCompact(val, currency);

  return {
    currency,
    setCurrency,
    symbol: config.symbol,
    config,
    format,
    formatCompact,
  };
};

/**
 * Backward compatibility aliases so existing formatRupee calls automatically respect active currency
 */
export const formatRupee = (val, decimals = 2) => formatCurrency(val, decimals);
export const formatRupeeCompact = (val) => formatCurrencyCompact(val);
export const CURRENCY_SYMBOL = "₹";
