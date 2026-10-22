import { create } from "zustand";
import { apiClient } from "../api/client";

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
    locale: "en-IE",
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

const DEFAULT_RATES = {
  USD: 1.0,
  INR: 96.28,
  EUR: 0.8935,
  GBP: 0.7567,
};

export const THEME_CONFIGS = {
  light: {
    id: "light",
    label: "Professional Light",
    description: "Clean institutional financial palette with high-contrast slate typography and crisp white cards",
    colors: {
      bg: "#F8FAFC",
      surface: "#FFFFFF",
      bullish: "#00A854",
      bearish: "#E53935",
      text: "#0F172A",
    },
  },
  dark: {
    id: "dark",
    label: "Midnight Dark",
    description: "Deep Midnight Black with Neon Matrix Green and Electric Coral Red",
    colors: {
      bg: "#0B0E14",
      surface: "#161A22",
      bullish: "#00E676",
      bearish: "#FF3D00",
      text: "#EAECEF",
    },
  },
};

const FOREX_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getStoredTheme = () => {
  try {
    const stored = localStorage.getItem("equitix_theme");
    return stored === "dark" || stored === "light" ? stored : "light";
  } catch {
    return "light";
  }
};

export const applyThemeToDocument = (theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }
};

// Apply theme immediately upon store file evaluation
if (typeof window !== "undefined") {
  try {
    applyThemeToDocument(getStoredTheme());
  } catch {
    // Ignore initial apply error
  }
}

const getStoredCurrency = () => {
  try {
    const stored = localStorage.getItem("equitix_currency");
    return stored && SUPPORTED_CURRENCIES[stored] ? stored : "INR";
  } catch {
    return "INR";
  }
};

const getStoredRates = () => {
  try {
    const raw = localStorage.getItem("equitix_forex_rates");
    const rawTime = localStorage.getItem("equitix_forex_timestamp");
    if (raw) {
      const age = rawTime ? Date.now() - Number(rawTime) : Infinity;
      const parsed = JSON.parse(raw);
      // Discard stale rates older than 10 mins or outdated pre-90 INR rates
      if (age < FOREX_TTL_MS && parsed?.INR && parsed.INR > 90 && parsed?.EUR && parsed?.GBP) {
        return parsed;
      }
    }
  } catch {
    // Fall back to default rates
  }
  return DEFAULT_RATES;
};

export const useSettingsStore = create((set, get) => ({
  theme: getStoredTheme(),
  currency: getStoredCurrency(),
  rates: getStoredRates(),
  lastUpdated: null,
  isLoadingForex: false,

  setTheme: (newTheme) => {
    if (newTheme !== "light" && newTheme !== "dark") return;
    try {
      localStorage.setItem("equitix_theme", newTheme);
    } catch {
      // Ignore storage errors
    }
    applyThemeToDocument(newTheme);
    set({ theme: newTheme });
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },

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

  /**
   * Fetch live forex exchange rates from the backend or open exchange rate feed
   */
  fetchLiveForexRates: async () => {
    set({ isLoadingForex: true });
    try {
      // 1. Try local FastAPI endpoint
      const res = await apiClient.get("/stocks/forex-rates");
      if (res?.data?.rates) {
        const liveRates = {
          USD: 1.0,
          INR: Number(res.data.rates.INR) || 96.28,
          EUR: Number(res.data.rates.EUR) || 0.8935,
          GBP: Number(res.data.rates.GBP) || 0.7567,
        };
        try {
          localStorage.setItem("equitix_forex_rates", JSON.stringify(liveRates));
          localStorage.setItem("equitix_forex_timestamp", String(Date.now()));
        } catch {
          // Ignore storage errors
        }
        set({
          rates: liveRates,
          lastUpdated: res.data.timestamp || new Date().toISOString(),
          isLoadingForex: false,
        });
        return liveRates;
      }
    } catch {
      // 2. Fallback to direct public forex API if backend is unavailable
      try {
        const fallbackRes = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await fallbackRes.json();
        if (data?.rates) {
          const liveRates = {
            USD: 1.0,
            INR: Number(data.rates.INR) || 96.28,
            EUR: Number(data.rates.EUR) || 0.8935,
            GBP: Number(data.rates.GBP) || 0.7567,
          };
          try {
            localStorage.setItem("equitix_forex_rates", JSON.stringify(liveRates));
            localStorage.setItem("equitix_forex_timestamp", String(Date.now()));
          } catch {
            // Ignore storage errors
          }
          set({
            rates: liveRates,
            lastUpdated: new Date().toISOString(),
            isLoadingForex: false,
          });
          return liveRates;
        }
      } catch {
        // Keep existing rates
      }
    }
    set({ isLoadingForex: false });
    return get().rates;
  },
}));

// Automatically trigger live forex rate retrieval on app initialization & poll every 5 minutes
const FOREX_AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

if (typeof window !== "undefined") {
  // Initial fetch on startup
  try {
    useSettingsStore.getState().fetchLiveForexRates();
  } catch {
    // Silent init failure
  }

  // Periodic automatic background sync every 5 minutes
  setInterval(() => {
    try {
      useSettingsStore.getState().fetchLiveForexRates();
    } catch {
      // Silent background error
    }
  }, FOREX_AUTO_REFRESH_INTERVAL_MS);

  // Re-sync on tab refocus if 5 minutes have passed
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const state = useSettingsStore.getState();
      const lastTime = state.lastUpdated ? new Date(state.lastUpdated).getTime() : 0;
      if (Date.now() - lastTime >= FOREX_AUTO_REFRESH_INTERVAL_MS) {
        state.fetchLiveForexRates();
      }
    }
  });
}
