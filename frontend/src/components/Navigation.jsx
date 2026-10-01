import React from "react";
import { Briefcase, TrendingUp, Cpu } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export const Navigation = () => {
  const { activeTab, setActiveTab } = useAuthStore();

  const navItems = [
    { id: "dashboard", label: "Portfolio", icon: Briefcase },
    { id: "market", label: "Market", icon: TrendingUp },
    { id: "models", label: "ML Models", icon: Cpu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-brand-surface/90 backdrop-blur-lg border-t border-white/10 px-6 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
                isActive
                  ? "text-brand-emerald font-semibold scale-105"
                  : "text-brand-textMuted hover:text-brand-textSecondary"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "text-brand-emerald" : ""}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-emerald rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
