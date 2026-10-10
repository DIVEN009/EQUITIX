import React from "react";
import {
  X,
  Clock,
  Calendar,
  Globe,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { NSE_HOLIDAYS, US_HOLIDAYS } from "../utils/marketSchedule";

export const MarketScheduleModal = ({
  isOpen,
  onClose,
  currentStatus,
  simulationMode,
  setSimulationMode,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const todayIso = new Date().toISOString().split("T")[0];

  // Filter upcoming holidays for NSE and US
  const upcomingNseHolidays = Object.entries(NSE_HOLIDAYS)
    .filter(([dateStr]) => dateStr >= todayIso)
    .slice(0, 6);

  const upcomingUsHolidays = Object.entries(US_HOLIDAYS)
    .filter(([dateStr]) => dateStr >= todayIso)
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0b101b] border border-white/15 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Exchange Trading Schedules & Status</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white/10 text-brand-textSecondary uppercase">
                  Global Guide
                </span>
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5">
                Official operational trading hours and holiday schedules for tracked markets.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-brand-textSecondary">
          {/* Current Active Status Callout */}
          {currentStatus && (
            <div
              className={`p-4 rounded-2xl border ${
                currentStatus.isOpen
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  {currentStatus.isOpen ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-ping" />
                  ) : (
                    <Moon className="w-4 h-4 text-amber-400" />
                  )}
                  <span>
                    {currentStatus.marketName}: {currentStatus.isOpen ? "Market Open" : "Market Closed"}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-white font-bold">
                  {currentStatus.session}
                </span>
              </div>
              <p className="text-xs mt-2 text-slate-300 leading-relaxed">
                {currentStatus.message}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-white/10 font-mono text-brand-textMuted">
                <span>Exchange Time: <strong className="text-white">{currentStatus.formattedTime}</strong></span>
                <span>Next Session: <strong className="text-white">{currentStatus.nextOpenText}</strong></span>
              </div>
            </div>
          )}

          {/* Interactive Simulation / Preview Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-cyan" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Developer & Customer Experience Preview
                </span>
              </div>
              {simulationMode !== "auto" && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Preview Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-brand-textMuted">
              Test how the screen reacts during live market sessions vs. weekend / holiday closures:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
              {[
                { id: "auto", label: "Auto (Live Clock)" },
                { id: "force_closed_weekend", label: "Closed: Weekend" },
                { id: "force_closed_holiday", label: "Closed: Holiday" },
                { id: "force_closed_after_hours", label: "Closed: After-Hours" },
                { id: "force_open", label: "Open: Live Regular" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSimulationMode?.(opt.id)}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-center transition-all cursor-pointer ${
                    simulationMode === opt.id
                      ? "bg-brand-emerald text-brand-bg font-extrabold shadow-emeraldGlow"
                      : "bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/15"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exchange Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Indian Stock Exchanges (NSE / BSE) */}
            <div className="p-4 rounded-2xl bg-brand-surface/70 border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇮🇳</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">NSE & BSE (India)</h4>
                    <span className="text-[10px] text-brand-textMuted">Asia/Kolkata (IST = UTC+5:30)</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold">
                  INR (₹)
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">Pre-Market Window</span>
                  <span className="font-mono text-white font-bold">09:00 - 09:15 AM IST</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">Regular Trading Session</span>
                  <span className="font-mono text-brand-emerald font-bold">09:15 AM - 03:30 PM IST</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">Post-Market Closing</span>
                  <span className="font-mono text-white font-bold">03:40 - 04:00 PM IST</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-brand-textMuted">Trading Days</span>
                  <span className="font-mono text-white">Monday - Friday</span>
                </div>
              </div>
            </div>

            {/* US Stock Exchanges (NYSE / NASDAQ) */}
            <div className="p-4 rounded-2xl bg-brand-surface/70 border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-base">🇺🇸</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">NYSE & NASDAQ (US)</h4>
                    <span className="text-[10px] text-brand-textMuted">America/New_York (EST/EDT)</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                  USD ($)
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">Pre-Market Window</span>
                  <span className="font-mono text-white font-bold">04:00 - 09:30 AM ET</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">Regular Trading Session</span>
                  <span className="font-mono text-brand-emerald font-bold">09:30 AM - 04:00 PM ET</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-brand-textMuted">After-Hours Session</span>
                  <span className="font-mono text-white font-bold">04:00 - 08:00 PM ET</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-brand-textMuted">Trading Days</span>
                  <span className="font-mono text-white">Monday - Friday</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Market Holidays List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-textMuted" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Upcoming Official Market Holidays
                </h4>
              </div>
              <span className="text-[10px] text-brand-textMuted font-mono">2025 - 2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Indian Holidays */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
                  NSE & BSE Holidays
                </span>
                <div className="space-y-1.5 divide-y divide-white/5">
                  {upcomingNseHolidays.map(([dt, name]) => (
                    <div key={dt} className="pt-1.5 first:pt-0 flex justify-between items-center text-[11px]">
                      <span className="text-slate-200">{name}</span>
                      <span className="font-mono text-brand-textMuted text-[10px]">{dt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* US Holidays */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  US NYSE/NASDAQ Holidays
                </span>
                <div className="space-y-1.5 divide-y divide-white/5">
                  {upcomingUsHolidays.map(([dt, name]) => (
                    <div key={dt} className="pt-1.5 first:pt-0 flex justify-between items-center text-[11px]">
                      <span className="text-slate-200">{name}</span>
                      <span className="font-mono text-brand-textMuted text-[10px]">{dt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-brand-textMuted">
            Prices displayed on closed market days reflect official settlement closes.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
