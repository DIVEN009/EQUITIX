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

function MainApp() {
  const { isAuthenticated, activeTab } = useAuthStore();

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-textPrimary flex flex-col selection:bg-brand-emerald selection:text-brand-bg relative overflow-x-hidden">
      {/* Dynamic Cinematic Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        onTimeUpdate={(e) => {
          if (e.target.currentTime >= 7.2) {
            e.target.currentTime = 0;
          }
        }}
        className="fixed inset-0 w-full h-full object-cover opacity-55 pointer-events-none -z-20 filter brightness-110 contrast-105"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>

      {/* Subtle Atmospheric Overlay & Quant Grid */}
      <div className="fixed inset-0 bg-[#0A0E17]/50 pointer-events-none -z-10 quant-grid-bg" />

      {/* Ambient atmospheric lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[350px] bg-brand-emerald/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-[500px] h-[400px] bg-brand-cyan/15 rounded-full blur-[140px] pointer-events-none -z-10" />

      <Header />
      <main className="flex-1 relative z-10">
        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "market" && <MarketExplorerPage />}
        {activeTab === "models" && <ModelEvaluationPage />}
      </main>
      <Navigation />
      <ToastContainer />
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

