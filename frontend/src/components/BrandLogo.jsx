import React from "react";
import { TrendingUp } from "lucide-react";

export const BrandLogo = ({ size = "md", showAiBadge = true }) => {
  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const containerSizes = {
    sm: "p-1.5 rounded-lg",
    md: "p-2.5 rounded-xl",
    lg: "p-3.5 rounded-2xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div
          className={`bg-brand-card border border-emerald-500/30 flex items-center justify-center shadow-emeraldGlow ${containerSizes[size]}`}
        >
          <TrendingUp className={`text-brand-emerald stroke-[2.5] ${iconSizes[size]}`} />
        </div>
        {showAiBadge && (
          <span className="absolute -top-1 -right-2 px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-emerald-500/20 text-brand-emerald border border-brand-emerald/40 rounded-full">
            AI
          </span>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white">Equitix</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-brand-textMuted font-medium block">
          Precision Intelligence
        </span>
      </div>
    </div>
  );
};
