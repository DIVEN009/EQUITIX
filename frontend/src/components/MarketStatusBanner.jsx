import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Moon,
  Sun,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Info,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  calculateMarketStatus,
  formatCountdown,
  resolveExchangeType,
} from "../utils/marketSchedule";

export const MarketStatusBanner = ({
  ticker = "RELIANCE.NS",
  exchange = "NSE",
  latestTradingDate = null,
  backendStatus = null,
  simulationMode = "auto",
  onOpenSchedule = () => {},
}) => {
  const [now, setNow] = useState(() => new Date());
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem("equitix_market_banner_minimized") === "true";
    } catch {
      return false;
    }
  });

  // Live 1-second clock tick for real-time second-by-second countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live client-side status (hydrated or synchronized with backend)
  const status = React.useMemo(() => {
    return calculateMarketStatus(ticker, exchange, now, simulationMode);
  }, [ticker, exchange, now, simulationMode]);

  const toggleMinimized = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    try {
      localStorage.setItem("equitix_market_banner_minimized", String(next));
    } catch {}
  };

  const isClosed = !status.isOpen;

  // 1. If MARKET IS OPEN: Render sleek, reassuring emerald active banner
  if (!isClosed) {
    if (isMinimized) {
      return (
        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
            <span className="font-bold text-brand-emerald font-mono text-[11px]">
              MARKET OPEN
            </span>
            <span className="text-brand-textSecondary text-[11px] hidden sm:inline">
              {status.marketName} regular trading session is active.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSchedule}
              className="text-[10px] text-brand-emerald hover:underline font-semibold cursor-pointer"
            >
              Hours
            </button>
            <button
              onClick={toggleMinimized}
              className="text-brand-textMuted hover:text-brand-textPrimary p-0.5 cursor-pointer"
              title="Expand Details"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-emerald-500/25 bg-emerald-500/5 dark:bg-gradient-to-r dark:from-emerald-500/10 dark:via-brand-surface dark:to-emerald-500/5 shadow-cardGlass relative overflow-hidden transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-brand-emerald border border-emerald-500/30 shrink-0">
              <Sun className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-brand-emerald uppercase tracking-wider font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-ping" />
                  Regular Trading Session Open
                </span>
                <span className="text-[11px] font-bold text-brand-textPrimary">
                  {status.marketName}
                </span>
                {status.isSimulated && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 font-mono">
                    Simulated
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-textSecondary mt-0.5">
                Real-time execution active. Orders will trade at live market bid/ask quotes. Regular session closes at {status.regHoursText.split("-")[1]?.trim() || "03:30 PM"}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onOpenSchedule}
              className="px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-cardHover text-brand-textPrimary text-xs font-semibold border border-brand-border transition-colors cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5 text-brand-emerald" />
              <span>Hours Guide</span>
            </button>
            <button
              onClick={toggleMinimized}
              className="p-1.5 text-brand-textMuted hover:text-brand-textPrimary rounded-lg hover:bg-brand-cardHover transition-colors cursor-pointer"
              title="Minimize banner"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. If MARKET IS CLOSED: Render clear, informative notification banner
  if (isMinimized) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/15 dark:via-red-500/10 dark:to-brand-surface border border-amber-500/30 text-xs shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <Moon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-extrabold text-amber-500 font-mono text-[11px] shrink-0">
            MARKET CLOSED
          </span>
          <span className="text-brand-textPrimary font-medium text-[11px] truncate">
            {status.marketName} ({status.session}) • Reopens {status.nextOpenText}
          </span>
          <span className="hidden md:inline-block font-mono text-[10px] text-amber-600 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
            {formatCountdown(status.countdownSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={onOpenSchedule}
            className="text-[10px] text-amber-600 dark:text-amber-300 hover:underline font-semibold cursor-pointer hidden sm:inline"
          >
            Schedule
          </button>
          <button
            onClick={toggleMinimized}
            className="text-brand-textMuted hover:text-brand-textPrimary p-1 cursor-pointer flex items-center gap-1 text-[11px]"
            title="Expand full message"
          >
            <span>Expand</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/5 dark:bg-gradient-to-br dark:from-amber-500/10 dark:via-brand-surface dark:to-red-500/5 shadow-2xl relative overflow-hidden transition-all">
      {/* Subtle background ambient aura */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Column: Icon + Status Message */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 shrink-0 mt-0.5 shadow-sm">
            <Moon className="w-5 h-5 text-amber-500" />
          </div>

          <div className="space-y-1 min-w-0">
            {/* Header Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Market Closed
              </span>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-cardHover text-brand-textSecondary uppercase tracking-wider font-mono">
                {status.session}
              </span>

              <span className="text-[10px] font-mono text-brand-textMuted">
                {status.exchange}
              </span>

              {status.isSimulated && (
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono font-bold">
                  Demo Simulation
                </span>
              )}
            </div>

            {/* Headline */}
            <h3 className="text-sm sm:text-base font-extrabold text-brand-textPrimary tracking-tight pt-0.5">
              {status.marketName} is Currently Closed for Trading
            </h3>

            {/* Clear, Customer-Centric Explanation */}
            <p className="text-xs text-brand-textSecondary leading-relaxed max-w-2xl font-normal">
              {status.message} Prices, charts, and metrics displayed reflect the official closing values from the last trading session
              {latestTradingDate ? (
                <> (<strong>{latestTradingDate}</strong>)</>
              ) : (
                " (Friday close)"
              )}. You can still analyze historical charts, explore neural forecasts, and place simulated paper orders.
            </p>
          </div>
        </div>

        {/* Right Column: Live Countdown Box + Schedule CTA */}
        <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between md:justify-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 md:border-l md:border-brand-border md:pl-5">
          {/* Live Countdown Chip */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-2.5 px-3.5 space-y-1 text-center md:text-right">
            <span className="text-[10px] uppercase font-bold text-brand-textMuted tracking-wider block">
              Next Opening Bell
            </span>
            <div className="text-xs font-black text-brand-textPrimary font-mono flex items-center justify-center md:justify-end gap-1.5 text-amber-500 dark:text-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{formatCountdown(status.countdownSeconds)}</span>
            </div>
            <span className="text-[10px] text-brand-textMuted block font-mono">
              {status.nextOpenText}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenSchedule}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-brand-cardHover hover:bg-brand-card text-brand-textPrimary text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-brand-border shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-brand-emerald" />
              <span>Trading Schedule</span>
            </button>

            <button
              onClick={toggleMinimized}
              className="p-1.5 rounded-xl text-brand-textMuted hover:text-brand-textPrimary hover:bg-brand-cardHover transition-colors cursor-pointer"
              title="Minimize banner"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
