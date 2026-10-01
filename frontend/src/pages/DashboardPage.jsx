import React from "react";
import { Briefcase, ArrowUpRight, Plus, Sparkles } from "lucide-react";

export const DashboardPage = () => {
  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Valuation Header Card matching mockup */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-brand-textMuted mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Live Portfolio Valuation</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 text-[10px] font-bold">
            99.6% AI Sync
          </span>
        </div>

        <div className="text-3xl font-extrabold text-white tracking-tight mt-1">
          $148,920.45
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
          <span className="text-brand-emerald flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +$3,430.80 (+2.35%)
          </span>
          <span className="text-brand-textMuted">Unrealized</span>
          <span className="text-brand-red ml-auto">-$180.50 (-0.12%)</span>
        </div>

        {/* Asset allocation bar */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex justify-between text-[10px] text-brand-textSecondary mb-2 font-medium">
            <span>Allocation Distribution</span>
            <span className="text-brand-emerald">Deep Learning Net: High</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full flex overflow-hidden">
            <div className="bg-brand-emerald w-[74%]" title="Equities 74%" />
            <div className="bg-brand-cyan w-[16%]" title="Crypto 16%" />
            <div className="bg-white/40 w-[10%]" title="Cash 10%" />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-brand-textMuted font-mono">
            <span>• Equities 74%</span>
            <span>• Crypto 16%</span>
            <span>• Cash 10%</span>
          </div>
        </div>

        <button className="w-full btn-emerald-glow mt-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Predictive rebalancing card */}
      <div className="glass-panel rounded-2xl p-4 border border-brand-emerald/30 bg-emerald-500/5 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-white">Predictive Rebalancing</h4>
          <p className="text-[11px] text-brand-textSecondary mt-0.5">
            Equitix AI suggests 4% shift from AAPL to TSLA based on 7-day walk-forward neural momentum.
          </p>
        </div>
      </div>

      {/* Holdings list preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Holdings (5 Assets)</h3>
        </div>
        <div className="space-y-2">
          {[
            { ticker: "AAPL", name: "Apple Inc.", shares: "45 Shares", price: "$192.42", change: "+11.8%", positive: true },
            { ticker: "NVDA", name: "NVIDIA Corp.", shares: "28 Shares", price: "$887.30", change: "+36.4%", positive: true },
            { ticker: "MSFT", name: "Microsoft Corp.", shares: "30 Shares", price: "$425.10", change: "+5.8%", positive: true },
            { ticker: "TSLA", name: "Tesla Inc.", shares: "20 Shares", price: "$178.60", change: "-14.7%", positive: false },
          ].map((item) => (
            <div key={item.ticker} className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{item.ticker}</span>
                  <span className="text-[11px] text-brand-textMuted">{item.name}</span>
                </div>
                <div className="text-[11px] text-brand-textSecondary mt-0.5">{item.shares}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-white">{item.price}</div>
                <div className={`text-[11px] font-semibold ${item.positive ? "text-brand-emerald" : "text-brand-red"}`}>
                  {item.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
