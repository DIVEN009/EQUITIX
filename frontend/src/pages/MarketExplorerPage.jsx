import React, { useState } from "react";
import { Search, TrendingUp, Bookmark, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export const MarketExplorerPage = () => {
  const { selectedTicker, setSelectedTicker } = useAuthStore();
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedTicker(searchInput.trim().toUpperCase());
      setSearchInput("");
    }
  };

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Search Header */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search ticker, company, or asset (e.g. AAPL, NVDA)..."
          className="w-full bg-brand-surface border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-brand-textMuted focus:outline-none focus:border-brand-emerald transition-colors"
        />
      </form>

      {/* Quick ticker pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"].map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTicker(t)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              selectedTicker === t
                ? "bg-brand-emerald text-brand-bg font-bold shadow-sm"
                : "bg-brand-surface text-brand-textSecondary hover:text-white border border-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stock Quote Header Card */}
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">{selectedTicker}</h2>
              <span className="text-xs text-brand-textMuted">• NASDAQ</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">$192.42</div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-emerald mt-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+$3.84 (+2.04%) Today</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 text-[10px] font-bold">
            Live Stream
          </span>
        </div>

        {/* Timeframe selectors */}
        <div className="flex gap-1 bg-brand-surface p-1 rounded-xl mt-5 border border-white/5">
          {["1D", "1W", "1M", "6M", "1Y", "ALL"].map((tf, i) => (
            <button
              key={tf}
              className={`flex-1 py-1 text-[11px] font-medium rounded-lg ${
                i === 2 ? "bg-brand-card text-brand-emerald font-bold" : "text-brand-textMuted hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="h-44 bg-brand-surface/40 rounded-2xl mt-4 border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-2">
          <TrendingUp className="w-8 h-8 text-brand-emerald/40 animate-pulse" />
          <span>Interactive Candlestick Chart (Ready for Recharts integration in Day 10)</span>
        </div>

        {/* Predictive sentiment badge */}
        <div className="mt-4 p-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-brand-textMuted">Predictive Sentiment: </span>
            <span className="font-bold text-brand-emerald">Bullish</span>
          </div>
          <span className="text-[10px] text-brand-textSecondary">Neural forecast +3.2% in 7d</span>
        </div>

        {/* Fundamental metrics grid */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-2.5 rounded-xl bg-brand-surface/60 border border-white/5">
            <div className="text-[10px] text-brand-textMuted uppercase">Market Cap</div>
            <div className="font-bold text-white mt-0.5">$2.96T</div>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-surface/60 border border-white/5">
            <div className="text-[10px] text-brand-textMuted uppercase">P/E Ratio</div>
            <div className="font-bold text-white mt-0.5">31.4x</div>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-surface/60 border border-white/5">
            <div className="text-[10px] text-brand-textMuted uppercase">52W High / Low</div>
            <div className="font-bold text-white mt-0.5">$199.62 / $147.61</div>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-surface/60 border border-white/5">
            <div className="text-[10px] text-brand-textMuted uppercase">Beta (Volatility)</div>
            <div className="font-bold text-white mt-0.5">1.08</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          <button className="flex-1 py-2.5 rounded-xl bg-brand-surface border border-white/10 hover:border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
            <Bookmark className="w-4 h-4 text-brand-textMuted" />
            <span>Watchlist</span>
          </button>
          <button className="flex-1 btn-emerald-glow py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
            <ShoppingCart className="w-4 h-4" />
            <span>Buy {selectedTicker}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
