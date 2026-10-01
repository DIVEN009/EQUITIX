import { create } from "zustand";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("equitix_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("equitix_token") || null,
  user: getStoredUser(),
  isAuthenticated: Boolean(localStorage.getItem("equitix_token")),

  setAuth: (token, user) => {
    localStorage.setItem("equitix_token", token);
    localStorage.setItem("equitix_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem("equitix_token");
    localStorage.removeItem("equitix_user");
    set({ token: null, user: null, isAuthenticated: false });
  },

  // App navigation state matching the bottom tab bar [Portfolio, Market, ML Models]
  activeTab: "dashboard", // "dashboard" | "market" | "models"
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Shared active ticker across pages
  selectedTicker: "AAPL",
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker.toUpperCase() }),
}));
