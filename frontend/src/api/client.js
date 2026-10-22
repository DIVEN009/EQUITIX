import axios from "axios";

const normalizeApiUrl = (url) => {
  const base = (url || "http://localhost:8000/api/v1").trim().replace(/\/+$/, "");
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

// Request interceptor to inject stored JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("equitix_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // Clear token on 401 Unauthorized
      localStorage.removeItem("equitix_token");
      localStorage.removeItem("equitix_user");
      window.dispatchEvent(new Event("equitix_auth_expired"));
    }
    return Promise.reject(error);
  }
);
