/**
 * Equitix Currency Utilities for Indian Rupees (₹)
 */

/**
 * Format numeric value in Indian Rupees (₹) with en-IN comma separation.
 * Example: 154200.5 -> "₹1,54,200.50"
 */
export const formatRupee = (val, decimals = 2) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹0.00";
  const num = Number(val);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Format large sums in Indian Crore (Cr) and Lakh (L) notation.
 * Example: 15000000 -> "₹1.50 Cr"
 */
export const formatRupeeCompact = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "₹0";
  const num = Number(val);
  if (Math.abs(num) >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100_000) {
    return `₹${(num / 100_000).toFixed(2)} L`;
  }
  if (Math.abs(num) >= 1_000) {
    return `₹${(num / 1_000).toFixed(1)} K`;
  }
  return `₹${num.toFixed(2)}`;
};

/**
 * Currency Symbol Constant
 */
export const CURRENCY_SYMBOL = "₹";
