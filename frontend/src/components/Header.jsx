import React from "react";
import { LogOut, User } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useAuthStore } from "../store/authStore";

export const Header = () => {
  const { user, clearAuth } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <BrandLogo size="sm" />

        <div className="flex items-center gap-3">
          {/* Real-time server connection indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-brand-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
            <span>API Online</span>
          </div>

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-brand-surface border border-white/20 flex items-center justify-center text-xs text-brand-emerald font-bold">
              {user?.email ? user.email[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden md:inline text-xs text-brand-textSecondary max-w-[140px] truncate">
              {user?.email}
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
