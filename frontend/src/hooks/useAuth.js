import { useMutation, useQuery } from "@tanstack/react-query";
import { registerApi, loginApi, getMeApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const { setAuth, clearAuth, isAuthenticated, user, token } = useAuthStore();

  const registerMutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
    },
  });

  const userProfileQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getMeApi,
    enabled: isAuthenticated,
    retry: false,
  });

  return {
    user,
    token,
    isAuthenticated,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.response?.data?.detail || loginMutation.error?.message,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error?.response?.data?.detail || registerMutation.error?.message,
    logout: clearAuth,
    isLoadingProfile: userProfileQuery.isLoading,
  };
};
