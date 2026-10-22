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
} from "lucide-react";

/**
 * Top Header Bar — Logo, Navigation Tabs, Theme Toggle, User Menu.
 */
export const Header = ({ onOpenSettings }) => {
  const { user, activeTab, setActiveTab } = useAuthStore();
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
          <BrandLogo size="default" />

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
                <div className="w-7 h-7 rounded-lg bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-brand-emerald" />
                </div>
                <span className="hidden sm:block text-sm font-semibold text-brand-textPrimary max-w-[100px] truncate">
                  {user?.first_name || "User"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-brand-textMuted transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-slide-down z-50">
                  <div className="px-4 py-3 border-b border-brand-border">
                    <p className="text-sm font-bold text-brand-textPrimary truncate">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-brand-textMuted truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
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
                      <span>Sign Out</span>
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
