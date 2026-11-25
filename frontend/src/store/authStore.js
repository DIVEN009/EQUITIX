import { create } from "zustand";
import {
  initDemoSession,
  clearDemoSession,
} from "../services/demoPortfolioService";

const getStoredToken = () => {
  try {
    return (
      sessionStorage.getItem("equitix_demo_token") ||
      localStorage.getItem("equitix_token") ||
      null
    );
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const demoUser = sessionStorage.getItem("equitix_demo_user");
    if (demoUser) return JSON.parse(demoUser);

    const raw = localStorage.getItem("equitix_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isStoredDemo = () => {
  try {
    return Boolean(sessionStorage.getItem("equitix_demo_token"));
  } catch {
    return false;
  }
};

export const useAuthStore = create((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: Boolean(getStoredToken()),
  isDemo: isStoredDemo(),

  // Standard persistent login (stores in localStorage for regular registered accounts)
  setAuth: (token, user) => {
    try {
      localStorage.setItem("equitix_token", token);
      localStorage.setItem("equitix_user", JSON.stringify(user));
      clearDemoSession();
    } catch (e) {
      console.warn("Storage write error:", e);
    }
    set({ token, user, isAuthenticated: true, isDemo: false });
  },

  // Instant 1-Click Demo login (stores strictly in sessionStorage, wiped when tab/session closes)
  setDemoAuth: () => {
    const demoToken = `demo_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const demoUser = {
      id: "demo-user-session",
      email: "demo@equitix.com",
      first_name: "Demo",
      last_name: "Trader",
      is_demo: true,
    };

    try {
      sessionStorage.setItem("equitix_demo_token", demoToken);
      sessionStorage.setItem("equitix_demo_user", JSON.stringify(demoUser));
      initDemoSession();
    } catch (e) {
      console.warn("SessionStorage write error:", e);
    }

    set({
      token: demoToken,
      user: demoUser,
      isAuthenticated: true,
      isDemo: true,
    });
  },

  // Clears all authentication state (both persistent and session-only)
  clearAuth: () => {
    try {
      localStorage.removeItem("equitix_token");
      localStorage.removeItem("equitix_user");
      clearDemoSession();
    } catch (e) {
      console.warn("Storage clear error:", e);
    }
    set({ token: null, user: null, isAuthenticated: false, isDemo: false });
  },

  // App navigation state matching the bottom tab bar [Portfolio, Market, ML Models]
  activeTab: "dashboard", // "dashboard" | "market" | "models"
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Shared active ticker across pages
  selectedTicker: "AAPL",
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker.toUpperCase() }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("equitix_auth_expired", () => {
    useAuthStore.getState().clearAuth();
  });
}
