import { create } from "zustand";

export const SUPPORTED_CURRENCIES = {
  INR: {
    code: "INR",
    symbol: "₹",
    label: "INR (₹)",
    name: "Indian Rupee",
    locale: "en-IN",
    flag: "🇮🇳",
  },
  USD: {
    code: "USD",
    symbol: "$",
    label: "USD ($)",
    name: "US Dollar",
    locale: "en-US",
    flag: "🇺🇸",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    label: "EUR (€)",
    name: "Euro",
    locale: "de-DE",
    flag: "🇪🇺",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    label: "GBP (£)",
    name: "British Pound",
    locale: "en-GB",
    flag: "🇬🇧",
  },
};

const getStoredCurrency = () => {
  try {
    const stored = localStorage.getItem("equitix_currency");
    return stored && SUPPORTED_CURRENCIES[stored] ? stored : "INR";
  } catch {
    return "INR";
  }
};

export const useSettingsStore = create((set, get) => ({
  currency: getStoredCurrency(),

  setCurrency: (newCurrency) => {
    if (!SUPPORTED_CURRENCIES[newCurrency]) return;
    try {
      localStorage.setItem("equitix_currency", newCurrency);
    } catch {
      // Ignore storage errors
    }
    set({ currency: newCurrency });
  },

  getCurrencyConfig: () => {
    const curr = get().currency;
    return SUPPORTED_CURRENCIES[curr] || SUPPORTED_CURRENCIES.INR;
  },
}));
