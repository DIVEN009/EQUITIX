import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPortfoliosApi,
  createPortfolioApi,
  fetchPortfolioDetailApi,
  executeTransactionApi,
  deletePortfolioApi,
} from "../api/portfolio";

export const usePortfolios = () => {
  const queryClient = useQueryClient();

  const portfoliosQuery = useQuery({
    queryKey: ["portfolios"],
    queryFn: fetchPortfoliosApi,
  });

  const createPortfolioMutation = useMutation({
    mutationFn: createPortfolioApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: deletePortfolioApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  return {
    portfolios: portfoliosQuery.data || [],
    isLoadingPortfolios: portfoliosQuery.isLoading,
    isErrorPortfolios: portfoliosQuery.isError,
    createPortfolio: createPortfolioMutation.mutateAsync,
    isCreatingPortfolio: createPortfolioMutation.isPending,
    deletePortfolio: deletePortfolioMutation.mutateAsync,
    isDeletingPortfolio: deletePortfolioMutation.isPending,
    refetchPortfolios: portfoliosQuery.refetch,
  };
};

export const usePortfolioDetail = (portfolioId) => {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["portfolio", portfolioId],
    queryFn: () => fetchPortfolioDetailApi(portfolioId),
    enabled: Boolean(portfolioId),
    refetchInterval: 15000, // Refresh every 15s for live pricing
  });

  const transactionMutation = useMutation({
    mutationFn: executeTransactionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  return {
    portfolio: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    executeTransaction: transactionMutation.mutateAsync,
    isExecutingTx: transactionMutation.isPending,
    txError: transactionMutation.error?.response?.data?.detail || transactionMutation.error?.message,
    refetch: detailQuery.refetch,
  };
};
