import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/authStore";
import { AuthPage } from "./pages/AuthPage";
import { Header } from "./components/Header";
import { Navigation } from "./components/Navigation";
import { ToastContainer } from "./components/ToastContainer";
import { ErrorBoundary } from "./components/ErrorBoundary";
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

import { SettingsModal } from "./components/SettingsModal";
import { useSettingsStore } from "./store/settingsStore";

function MainApp() {
  const { isAuthenticated, activeTab } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    useSettingsStore.getState().fetchLiveForexRates();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary flex flex-col selection:bg-brand-emerald selection:text-white relative overflow-x-hidden transition-colors">
      {/* Subtle Institutional Quant Grid */}
      <div className="fixed inset-0 quant-grid-bg pointer-events-none -z-20" />

      {/* Atmospheric Spatial Depth Glows (Antigravity Design) */}
      <div className="fixed -top-40 left-1/3 w-[700px] h-[500px] bg-brand-emerald/10 dark:bg-brand-emerald/12 rounded-full blur-[150px] pointer-events-none -z-10 animate-pulse-slow" />
      <div className="fixed bottom-0 right-10 w-[600px] h-[450px] bg-brand-cyan/8 dark:bg-brand-cyan/10 rounded-full blur-[160px] pointer-events-none -z-10" />

      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-1 relative z-10">
        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "market" && <MarketExplorerPage />}
        {activeTab === "models" && <ModelEvaluationPage />}
      </main>
      <Navigation />
      <ToastContainer />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

