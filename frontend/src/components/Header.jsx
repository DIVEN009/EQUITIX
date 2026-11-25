import React from "react";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";
import { BrandLogo } from "./BrandLogo";
import {
  Sun,
  Moon,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
} from "lucide-react";

/**
 * Top Header Bar — Logo, Navigation Tabs, Theme Toggle, User Menu, and Demo status.
 */
export const Header = ({ onOpenSettings }) => {
  const { user, activeTab, setActiveTab, isDemo } = useAuthStore();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { theme, toggleTheme } = useSettingsStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  const navItems = [
    { id: "dashboard", label: "Portfolio" },
    { id: "market", label: "Markets" },
    { id: "models", label: "ML Models" },
  ];

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <BrandLogo size="default" />
            {isDemo && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold uppercase tracking-wider font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Session Demo
              </span>
            )}
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-brand-card/50 rounded-2xl p-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === item.id
                    ? "bg-brand-emerald text-white shadow-emeraldGlow"
                    : "text-brand-textSecondary hover:text-brand-textPrimary hover:bg-brand-cardHover"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Demo Badge on mobile/tablet */}
            {isDemo && (
              <div className="flex sm:hidden items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Demo</span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-brand-textSecondary hover:text-brand-emerald transition-all duration-300 cursor-pointer"
              title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-emerald/40 text-brand-textSecondary hover:text-brand-emerald transition-all duration-300 cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-surface border border-brand-border hover:border-brand-emerald/40 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDemo
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                    : "bg-brand-emerald/10 border border-brand-emerald/20 text-brand-emerald"
                }`}>
                  {isDemo ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-brand-textPrimary max-w-[100px] truncate">
                  {user?.first_name || (isDemo ? "Demo" : "User")}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-brand-textMuted transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50">
                  <div className="px-4 py-3 border-b border-brand-border">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-brand-textPrimary truncate">
                        {user?.first_name} {user?.last_name}
                      </p>
                      {isDemo && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">
                          Session
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-textMuted truncate mt-0.5">{user?.email}</p>
                    {isDemo && (
                      <p className="text-[10px] text-amber-500/80 mt-1.5 font-medium leading-snug">
                        ⚡ Temporary guest data resets automatically when browser is closed.
                      </p>
                    )}
                  </div>

                  <div className="p-1.5 space-y-0.5">

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSettings?.();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-brand-textSecondary hover:bg-brand-card hover:text-brand-textPrimary transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        clearAuth();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-brand-red hover:bg-red-500/5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isDemo ? "Exit Demo Session" : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
