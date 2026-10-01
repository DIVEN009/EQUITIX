import { apiClient } from "./client";

export const registerApi = async ({ email, password }) => {
  const response = await apiClient.post("/auth/register", { email, password });
  return response.data;
};

export const loginApi = async ({ email, password }) => {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data;
};

export const getMeApi = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};
