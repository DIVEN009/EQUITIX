import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { AuthPage } from "./pages/AuthPage";
import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketExplorerPage } from "./pages/MarketExplorerPage";
import { ModelEvaluationPage } from "./pages/ModelEvaluationPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

function MainApp() {
  const { isAuthenticated, activeTab } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary flex flex-col selection:bg-brand-emerald selection:text-brand-bg">
      <Header />
      <main className="flex-1">
        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "market" && <MarketExplorerPage />}
        {activeTab === "models" && <ModelEvaluationPage />}
      </main>
      <Navigation />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}
