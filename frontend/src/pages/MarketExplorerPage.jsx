import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  ChevronRight,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import {
  useStockQuote,
  useStockHistory,
  useStockSearch,
  useStockPredictions,
} from "../hooks/useStocks";
import { usePortfolios, usePortfolioDetail } from "../hooks/usePortfolios";
import { StockChart } from "../components/StockChart";
import { TransactionModal } from "../components/TransactionModal";
import { toast } from "../store/toastStore";
import { formatRupee } from "../utils/currency";

const TIMEFRAMES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 1825 },
];

const POPULAR_TICKERS = [
  "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "TATAMOTORS.NS",
  "HDFCBANK.NS",
  "AAPL",
  "NVDA",
  "TSLA",
];

export const MarketExplorerPage = () => {
  const { selectedTicker, setSelectedTicker, setActiveTab } = useAuthStore();
  const [searchInput, setSearchInput] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]); // 1M default
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const stored = localStorage.getItem("equitix_watchlist");
      return stored ? JSON.parse(stored) : ["RELIANCE.NS", "TCS.NS", "AAPL"];
    } catch {
      return ["RELIANCE.NS", "TCS.NS", "AAPL"];
    }
  });

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Portfolios for quick Buy modal execution
  const { portfolios } = usePortfolios();
  const activePortfolioId = portfolios?.[0]?.id || null;
  const { portfolio, executeTransaction, isExecutingTx, txError } =
    usePortfolioDetail(activePortfolioId);

  // Market Queries
  const { data: quote } = useStockQuote(selectedTicker);

  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useStockHistory(selectedTicker, selectedTimeframe.days);

  const { data: searchResults, isLoading: isSearching } = useStockSearch(searchInput);

  const { data: predictionData } = useStockPredictions(selectedTicker);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTicker = (ticker) => {
    setSelectedTicker(ticker);
    setSearchInput("");
    setIsSearchOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSelectTicker(searchInput.trim().toUpperCase());
    }
  };

  const toggleWatchlist = (ticker) => {
    setWatchlist((prev) => {
      const willInclude = !prev.includes(ticker);
      const updated = willInclude
        ? [...prev, ticker]
        : prev.filter((t) => t !== ticker);
      localStorage.setItem("equitix_watchlist", JSON.stringify(updated));
      if (willInclude) {
        toast.success("Watchlist Updated", `Added ${ticker} to tracked assets.`);
      } else {
        toast.info("Watchlist Updated", `Removed ${ticker} from watchlist.`);
      }
      return updated;
    });
  };

  const handleExecuteTx = async (txData) => {
    await executeTransaction(txData);
    toast.success(
      "Order Placed",
      `${txData.action} ${txData.shares} ${txData.ticker} executed at ${formatRupee(txData.price)}.`
    );
  };

  const isCurrentInWatchlist = watchlist.includes(selectedTicker);

  // Calculate fundamental statistics from history & quote
  const currentPrice = quote?.current_price || (history?.data?.length ? history.data[history.data.length - 1].close : 0);
  const change = quote?.change ?? 0;
  const changePercent = quote?.change_percent ?? 0;
  const isUp = change >= 0;

  const stats = React.useMemo(() => {
    if (!history?.data || history.data.length === 0) {
      return { high52: 0, low52: 0, avgVolume: 0, latestVolume: 0 };
    }
    const highs = history.data.map((d) => d.high || d.close);
    const lows = history.data.map((d) => d.low || d.close);
    const volumes = history.data.map((d) => d.volume || 0);

    const high52 = Math.max(...highs);
    const low52 = Math.min(...lows);
    const latestVolume = volumes[volumes.length - 1] || 0;
    const avgVolume = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);

    return { high52, low52, avgVolume, latestVolume };
  }, [history]);

  // Derive ML Predictive sentiment
  const mlForecast = React.useMemo(() => {
    if (!predictionData?.predictions || predictionData.predictions.length === 0) {
      return null;
    }
    // Sort forecasts by target_date ascending
    const sorted = [...predictionData.predictions].sort(
      (a, b) => new Date(a.target_date) - new Date(b.target_date)
    );
    const lstmForecasts = sorted.filter((p) => p.model_name.toLowerCase().includes("lstm"));
    const primaryForecast = lstmForecasts.length > 0 ? lstmForecasts[lstmForecasts.length - 1] : sorted[sorted.length - 1];

    if (!primaryForecast || !currentPrice) return null;

    const diff = primaryForecast.predicted_price - currentPrice;
    const diffPct = (diff / currentPrice) * 100;
    const sentiment = diffPct > 1.5 ? "Bullish" : diffPct < -1.5 ? "Bearish" : "Neutral";

    return {
      sentiment,
      targetPrice: primaryForecast.predicted_price,
      targetDate: primaryForecast.target_date,
      diffPct,
      modelName: primaryForecast.model_name,
    };
  }, [predictionData, currentPrice]);

  return (
    <div className="max-w-md md:max-w-3xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Search Header with Autocomplete Dropdown */}
      <div ref={searchContainerRef} className="relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search ticker, company name, or asset (e.g. AAPL, NVDA)..."
            className="w-full bg-brand-surface border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-brand-textMuted focus:outline-none focus:border-brand-emerald transition-colors"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-brand-emerald animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
          )}
        </form>

        {/* Autocomplete Dropdown Menu */}
        {isSearchOpen && searchInput.trim().length > 0 && searchResults && (
          <div className="absolute z-30 left-0 right-0 mt-2 bg-brand-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-brand-textMuted">
                No matching stocks found for "{searchInput}".
              </div>
            ) : (
              searchResults.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectTicker(stock.ticker)}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-brand-card/80 border-b border-white/5 last:border-0 transition-colors text-left"
                >
                  <div>
                    <span className="font-bold text-white text-xs mr-2">
                      {stock.ticker}
                    </span>
                    <span className="text-xs text-brand-textSecondary">
                      {stock.company_name}
                    </span>
                  </div>
                  {stock.sector && (
                    <span className="text-[10px] text-brand-textMuted bg-brand-card px-2 py-0.5 rounded-full border border-white/5">
                      {stock.sector}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Ticker Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {POPULAR_TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => handleSelectTicker(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
              selectedTicker === t
                ? "bg-brand-emerald text-brand-bg font-bold shadow-emeraldGlow scale-105"
                : "bg-brand-surface text-brand-textSecondary hover:text-white border border-white/5 hover:border-white/20"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Primary Stock Detail & Chart Card */}
      <div className="glass-panel rounded-3xl p-5 md:p-6 space-y-5">
        {/* Ticker Header & Live Quote */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {selectedTicker}
              </h2>
              <span className="text-xs text-brand-textMuted">
                {quote?.company_name || "Company Profile"}
              </span>
              {quote?.sector && (
                <span className="text-[10px] text-brand-textMuted bg-brand-surface px-2 py-0.5 rounded-md border border-white/5 hidden sm:inline-block">
                  {quote.sector}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-3xl font-black text-white tracking-tight">
                {currentPrice ? formatRupee(currentPrice) : "---"}
              </span>
              <div
                className={`flex items-center gap-1 text-xs font-bold ${
                  isUp ? "text-brand-emerald" : "text-brand-red"
                }`}
              >
                {isUp ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>
                  {isUp ? "+" : ""}
                  {formatRupee(change)} ({isUp ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                quote?.source === "live"
                  ? "bg-emerald-500/10 text-brand-emerald border-brand-emerald/30 shadow-sm"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {quote?.source === "live" ? "● Live Stream" : "Cached DB"}
            </span>
            <span className="text-[10px] text-brand-textMuted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {quote?.latest_trading_date || "Market Close"}
            </span>
          </div>
        </div>

        {/* Timeframe Selectors */}
        <div className="flex gap-1 bg-brand-surface p-1 rounded-2xl border border-white/5">
          {TIMEFRAMES.map((tf) => {
            const isSelected = selectedTimeframe.days === tf.days;
            return (
              <button
                key={tf.label}
                onClick={() => setSelectedTimeframe(tf)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  isSelected
                    ? "bg-brand-card text-brand-emerald font-bold shadow-sm border border-white/10"
                    : "text-brand-textMuted hover:text-white"
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Interactive Stock Chart (Recharts) */}
        <div className="pt-2">
          <StockChart
            data={history?.data || []}
            ticker={selectedTicker}
            isLoading={isLoadingHistory}
            error={historyError}
            onRetry={refetchHistory}
          />
        </div>

        {/* Predictive AI Sentiment Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-surface to-brand-card border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-emerald/10 text-brand-emerald">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white">
                  Equitix Machine Learning Intelligence
                </span>
                <span className="text-[10px] text-brand-textMuted block">
                  7-Day Horizon Walk-Forward Neural Forecast
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("models")}
              className="text-[11px] text-brand-cyan hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Model Insights</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {mlForecast ? (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-textMuted">Sentiment:</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    mlForecast.sentiment === "Bullish"
                      ? "bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30"
                      : mlForecast.sentiment === "Bearish"
                      ? "bg-red-500/10 text-brand-red border border-brand-red/30"
                      : "bg-blue-500/10 text-brand-cyan border border-brand-cyan/30"
                  }`}
                >
                  {mlForecast.sentiment}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-white">
                  Target: {formatRupee(mlForecast.targetPrice)}
                </span>
                <span
                  className={`text-[10px] font-semibold ml-1.5 ${
                    mlForecast.diffPct >= 0 ? "text-brand-emerald" : "text-brand-red"
                  }`}
                >
                  ({mlForecast.diffPct >= 0 ? "+" : ""}
                  {mlForecast.diffPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-brand-textMuted">
              <span>Deep LSTM batch inference generating daily forecasts.</span>
              <span className="text-[10px] text-brand-emerald font-semibold">Active Cron</span>
            </div>
          )}
        </div>

        {/* Fundamental Market Intelligence Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-brand-surface/70 border border-white/5">
            <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
              52W Range
            </span>
            <div className="font-bold text-white text-xs mt-1">
              {formatRupee(stats.low52)} - {formatRupee(stats.high52)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-surface/70 border border-white/5">
            <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
              Latest Volume
            </span>
            <div className="font-bold text-white text-xs mt-1">
              {stats.latestVolume ? stats.latestVolume.toLocaleString() : "---"}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-surface/70 border border-white/5">
            <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
              Average Volume
            </span>
            <div className="font-bold text-white text-xs mt-1">
              {stats.avgVolume ? stats.avgVolume.toLocaleString() : "---"}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-surface/70 border border-white/5">
            <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
              Prev Close
            </span>
            <div className="font-bold text-white text-xs mt-1">
              {quote?.previous_close ? formatRupee(quote.previous_close) : "---"}
            </div>
          </div>
        </div>

        {/* Action Controls: Watchlist & Buy Order */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => toggleWatchlist(selectedTicker)}
            className={`flex-1 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              isCurrentInWatchlist
                ? "bg-brand-card border-brand-emerald/40 text-brand-emerald"
                : "bg-brand-surface border-white/10 hover:border-white/20 text-white"
            }`}
          >
            {isCurrentInWatchlist ? (
              <BookmarkCheck className="w-4 h-4 text-brand-emerald" />
            ) : (
              <Bookmark className="w-4 h-4 text-brand-textMuted" />
            )}
            <span>{isCurrentInWatchlist ? "In Watchlist" : "+ Watchlist"}</span>
          </button>

          <button
            onClick={() => setIsTxModalOpen(true)}
            className="flex-1 btn-emerald-glow py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-emeraldGlow"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buy {selectedTicker}</span>
          </button>
        </div>
      </div>

      {/* Watchlist Quick Access Tray */}
      {watchlist.length > 0 && (
        <div className="glass-panel rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
              Saved Watchlist ({watchlist.length})
            </h3>
            <span className="text-[10px] text-brand-textMuted">Tap to inspect</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {watchlist.map((t) => (
              <button
                key={t}
                onClick={() => handleSelectTicker(t)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
                  selectedTicker === t
                    ? "bg-brand-card border-brand-emerald text-brand-emerald"
                    : "bg-brand-surface border-white/5 text-white hover:border-white/20"
                }`}
              >
                <span>{t}</span>
                {selectedTicker === t && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Modal Connected with Active Portfolio */}
      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          portfolioId={activePortfolioId}
          cashBalance={portfolio?.cash_balance || 0}
          initialTicker={selectedTicker}
          initialAction="BUY"
          onExecute={handleExecuteTx}
          isExecuting={isExecutingTx}
          error={txError}
        />
      )}
    </div>
  );
};
