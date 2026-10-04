import React, { useState, useRef, useEffect } from "react";
import { LogOut, User, ChevronDown, Check, Briefcase, TrendingUp, Sparkles } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuthStore } from "../store/authStore";
import { useCurrency, SUPPORTED_CURRENCIES } from "../utils/currency";
import { toast } from "../store/toastStore";

export const Header = () => {
  const { user, clearAuth, activeTab, setActiveTab } = useAuthStore();
  const {
    currency,
    setCurrency,
    config: currentConfig,
    rates,
  } = useCurrency();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const desktopNavItems = [
    { id: "dashboard", label: "Portfolio", icon: Briefcase },
    { id: "market", label: "Market", icon: TrendingUp },
    { id: "models", label: "Predictions", icon: Sparkles },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCurrency = (code) => {
    if (code !== currency) {
      setCurrency(code);
      const newConfig = SUPPORTED_CURRENCIES[code];
      toast.info("Currency Updated", `Display currency set to ${newConfig?.label || code}`);
    }
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <BrandLogo size="sm" onClick={() => setActiveTab("dashboard")} />

        {/* Desktop Navigation Pill Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-brand-surface/80 p-1 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-brand-emerald text-brand-bg shadow-emeraldGlow font-black"
                    : "text-brand-textSecondary hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Currency Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="Select currency"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-surface border border-white/10 hover:border-brand-emerald/40 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:bg-brand-surface/80"
            >
              <span className="text-sm leading-none">{currentConfig.flag}</span>
              <span className="font-mono text-brand-emerald font-bold">{currentConfig.symbol}</span>
              <span className="font-semibold text-slate-200">{currentConfig.code}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-brand-textMuted transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0d131f] rounded-2xl p-2 shadow-2xl border border-white/15 z-50 animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-textMuted border-b border-white/10 mb-1">
                  Display Currency
                </div>
                <div className="space-y-0.5">
                  {Object.values(SUPPORTED_CURRENCIES).map((item) => {
                    const isSelected = item.code === currency;
                    return (
                      <button
                        key={item.code}
                        onClick={() => handleSelectCurrency(item.code)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-emerald/20 text-brand-emerald font-bold border border-brand-emerald/30"
                            : "text-slate-200 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.flag}</span>
                          <span className="font-mono font-bold text-white">{item.symbol}</span>
                          <span className="font-semibold text-slate-200">{item.code}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-emerald stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 pt-2 border-t border-white/10 px-2 py-1 text-[10px] text-brand-textMuted flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                    <span>Live 1 USD ≈ ₹{(rates?.INR || 83.5).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-brand-surface border border-white/20 flex items-center justify-center text-xs text-brand-emerald font-bold">
              {user?.first_name
                ? user.first_name[0].toUpperCase()
                : user?.email
                ? user.email[0].toUpperCase()
                : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden md:inline text-xs text-brand-textSecondary max-w-[140px] truncate">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.email}
            </span>
            <button
              onClick={clearAuth}
              title="Sign Out"
              className="p-1.5 rounded-lg text-brand-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
