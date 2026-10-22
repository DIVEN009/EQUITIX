import React from "react";
import { useAuthStore } from "../store/authStore";
import { Briefcase, LineChart, Brain } from "lucide-react";

/**
 * Bottom Mobile Navigation Bar — visible only on mobile/tablet.
 */
export const Navigation = () => {
  const { activeTab, setActiveTab } = useAuthStore();

  const tabs = [
    { id: "dashboard", label: "Portfolio", icon: Briefcase },
    { id: "market", label: "Markets", icon: LineChart },
    { id: "models", label: "ML Models", icon: Brain },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-bg/90 backdrop-blur-xl border-t border-brand-border">
      <div className="flex items-center justify-around py-2 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive
                  ? "text-brand-emerald"
                  : "text-brand-textMuted hover:text-brand-textSecondary"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                isActive ? "bg-brand-emerald/10" : ""
              }`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${
                isActive ? "text-brand-emerald" : ""
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
