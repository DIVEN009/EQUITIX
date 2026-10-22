import React from "react";

/**
 * Equitix SVG Brand Logo Component
 * Renders the Equitix wordmark with an optional icon.
 */
export const BrandLogo = ({ className = "", size = "default" }) => {
  const sizes = {
    sm: { text: "text-lg", icon: "w-6 h-6" },
    default: { text: "text-xl", icon: "w-7 h-7" },
    lg: { text: "text-2xl", icon: "w-9 h-9" },
    xl: { text: "text-3xl", icon: "w-11 h-11" },
  };

  const s = sizes[size] || sizes.default;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon — Geometric E mark */}
      <div className={`${s.icon} rounded-xl bg-brand-emerald flex items-center justify-center shadow-emeraldGlow`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-[60%] h-[60%]">
          <path
            d="M7 6h10M7 12h8M7 18h10"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {/* Wordmark */}
      <span className={`${s.text} font-black tracking-tight text-brand-textPrimary`}>
        Equitix
      </span>
    </div>
  );
};
