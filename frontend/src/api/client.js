import axios from "axios";

/**
 * Determine default API URL.
 * When accessed from a mobile device or other computer on the local network (e.g., http://192.168.1.15:5173),
 * using 'localhost' would point to the phone itself.
 * This dynamically targets the host machine running the backend on port 8000.
 */
const getDefaultApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    if (window.location.protocol === "https:") {
      return "/api/v1";
    }
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return `http://${window.location.hostname}:8000/api/v1`;
    }
  }
  return "http://localhost:8000/api/v1";
};

const normalizeApiUrl = (url) => {
  const base = (url || getDefaultApiUrl()).trim().replace(/\/+$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
};

const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 25000,
});

// Request interceptor to inject stored JWT token (checks both sessionStorage for demo and localStorage for regular account)
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token =
        sessionStorage.getItem("equitix_demo_token") ||
        localStorage.getItem("equitix_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore storage access errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authorization expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        sessionStorage.removeItem("equitix_demo_token");
        sessionStorage.removeItem("equitix_demo_user");
        localStorage.removeItem("equitix_token");
        localStorage.removeItem("equitix_user");
      } catch {
        // Ignore storage errors
      }
      window.dispatchEvent(new Event("equitix_auth_expired"));
    }
    return Promise.reject(error);
  }
);
