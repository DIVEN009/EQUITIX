import React, { useId } from "react";

/**
 * EquitixMark: Razor-sharp vector SVG icon mark.
 * Pure vector mathematics with quantitative market momentum bars
 * and an upward exponential breakout trajectory with neon emerald glow.
 */
export const EquitixMark = ({ size = 36, className = "" }) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, "_");

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#141d2e] via-[#0d1424] to-[#070b14] border border-brand-emerald/30 shadow-[0_0_16px_rgba(0,245,155,0.18)] transition-all duration-300 group-hover:border-brand-emerald/60 group-hover:shadow-[0_0_24px_rgba(0,245,155,0.32)] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Interior ambient emerald backlight */}
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-emerald/15 via-transparent to-transparent pointer-events-none" />

      <svg
        viewBox="0 0 38 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%] relative z-10"
      >
        <defs>
          <linearGradient id={`eqBar1_${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00F59B" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`eqBar2_${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00F59B" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`eqBar3_${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00F59B" stopOpacity="1" />
          </linearGradient>
          <linearGradient id={`eqBar4_${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#00F59B" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id={`eqLine_${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#00F59B" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#00F59B" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <filter id={`eqGlow_${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#00F59B" floodOpacity="0.75" />
          </filter>
        </defs>

        {/* 4 Quantitative Volume/Growth Bars with rounded caps */}
        <rect x="5" y="21" width="4.2" height="10" rx="1.5" fill={`url(#eqBar1_${id})`} />
        <rect x="12" y="16" width="4.2" height="15" rx="1.5" fill={`url(#eqBar2_${id})`} />
        <rect x="19" y="11" width="4.2" height="20" rx="1.5" fill={`url(#eqBar3_${id})`} />
        <rect x="26" y="6" width="4.2" height="25" rx="1.5" fill={`url(#eqBar4_${id})`} />

        {/* Upward dynamic exponential curve with neon glow */}
        <path
          d="M 4 25 C 11 23.5, 18 16, 31 7"
          stroke={`url(#eqLine_${id})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          filter={`url(#eqGlow_${id})`}
        />

        {/* Chevron Arrowhead pointing up-right (45 deg) at trajectory tip */}
        <path
          d="M 23.5 7 H 31.5 V 15"
          stroke="#00F59B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#eqGlow_${id})`}
        />
      </svg>
    </div>
  );
};

/**
 * BrandLogo: Enterprise-grade branding lockup with zero raster "image vibes".
 * Utilizes crisp native typography and an SVG logomark for flawless rendering
 * across retina displays, dark themes, and high-density screens.
 */
export const BrandLogo = ({
  size = "md",
  layout = "horizontal", // "horizontal" | "vertical" | "icon-only"
  showTagline = null, // auto-computed if null
  uppercase = false,
  className = "",
  onClick = null,
}) => {
  const sizeConfig = {
    xs: {
      icon: 26,
      name: "text-sm font-bold tracking-tight",
      gap: "gap-2",
      tagline: "text-[7.5px] tracking-[0.16em]",
    },
    sm: {
      icon: 34,
      name: "text-base sm:text-lg font-black tracking-tight",
      gap: "gap-2.5",
      tagline: "text-[8.5px] tracking-[0.18em]",
    },
    md: {
      icon: 40,
      name: "text-xl font-black tracking-tight",
      gap: "gap-3",
      tagline: "text-[9px] tracking-[0.2em]",
    },
    lg: {
      icon: 52,
      name: "text-2xl sm:text-3xl font-black tracking-tight",
      gap: "gap-3",
      tagline: "text-[10px] sm:text-[11px] tracking-[0.24em]",
    },
    xl: {
      icon: 64,
      name: "text-3xl sm:text-4xl font-black tracking-tight",
      gap: "gap-4",
      tagline: "text-xs tracking-[0.28em]",
    },
  };

  const cfg = sizeConfig[size] || sizeConfig.md;
  const isVertical = layout === "vertical";
  const isIconOnly = layout === "icon-only";

  // Determine whether to show tagline if not explicitly overridden
  const shouldShowTagline =
    showTagline !== null
      ? showTagline
      : isVertical || size === "lg" || size === "xl";

  const brandName = uppercase ? (
    <span>
      EQUIT<span className="text-brand-emerald drop-shadow-[0_0_12px_rgba(0,245,155,0.45)]">IX</span>
    </span>
  ) : (
    <span>
      Equit<span className="text-brand-emerald drop-shadow-[0_0_12px_rgba(0,245,155,0.45)]">ix</span>
    </span>
  );

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      className={`group inline-flex select-none transition-all duration-200 ${
        isVertical ? "flex-col items-center text-center" : "flex-row items-center"
      } ${cfg.gap} ${
        onClick ? "cursor-pointer hover:opacity-95 active:scale-[0.98]" : ""
      } ${className}`}
    >
      <EquitixMark size={cfg.icon} />

      {!isIconOnly && (
        <div className={`flex flex-col ${isVertical ? "items-center" : "items-start"}`}>
          <div className="flex items-center leading-none">
            <span className={`${cfg.name} text-white group-hover:text-white transition-colors`}>
              {brandName}
            </span>
          </div>

          {shouldShowTagline && (
            <span
              className={`font-mono font-semibold uppercase text-brand-textMuted mt-1 leading-none ${cfg.tagline}`}
            >
              Predict • Analyze • Grow
            </span>
          )}
        </div>
      )}
    </div>
  );
};
