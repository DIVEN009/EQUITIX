import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Zap,
  Globe,
  X,
  Activity,
  RefreshCw,
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
import { useCurrency, getStockNativeCurrency } from "../utils/currency";
import { searchStocksApi, resolveStockApi } from "../api/stocks";

const TIMEFRAMES = [
  { label: "1D", days: 1 },
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
  "HDFCBANK.NS",
  "NHPC.NS",
  "SBIN.NS",
  "TMCV.NS",
  "ADANIENT.NS",
  "MARUTI.NS",
  "BAJFINANCE.NS",
  "IRFC.NS",
  "ALOKINDS.NS",
  "AAPL",
  "NVDA",
  "TSLA",
];

export const MarketExplorerPage = () => {
  const {
    formatStock,
    formatPortfolio,
    currency,
    config: currentConfig,
    rates,
    refreshRates,
    isLoadingForex,
  } = useCurrency();
  const { selectedTicker, setSelectedTicker, setActiveTab } = useAuthStore();
  const [searchInput, setSearchInput] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[0]); // 1D default
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
  const trendingRef = useRef(null);

  const scrollTrending = (direction) => {
    if (trendingRef.current) {
      trendingRef.current.scrollBy({
        left: direction === "left" ? -240 : 240,
        behavior: "smooth",
      });
    }
  };

  // Portfolios for quick Buy modal execution
  const { portfolios } = usePortfolios();
  const activePortfolioId = portfolios?.[0]?.id || null;
  const { portfolio, executeTransaction, isExecutingTx, txError } =
    usePortfolioDetail(activePortfolioId);

  // Market Queries
  const {
    data: quote,
    refetch: refetchQuote,
    isFetching: isFetchingQuote,
    error: quoteError,
  } = useStockQuote(selectedTicker);

  const {
    data: history,
    isLoading: isLoadingHistory,
    isFetching: isFetchingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useStockHistory(selectedTicker, selectedTimeframe.days);

  const { data: searchResults, isFetching: isSearching } = useStockSearch(searchInput);

  const { data: predictionData } = useStockPredictions(selectedTicker);

  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  useEffect(() => {
    if (history?.data) {
      setLastRefreshedAt(new Date());
    }
  }, [history?.data]);

  const handleInstantRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        refetchHistory(),
        refetchQuote(),
      ]);
      setLastRefreshedAt(new Date());
      toast.success(`Market chart refreshed for ${selectedTicker}`);
    } catch (err) {
      toast.error("Failed to refresh chart data");
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isRefreshingChart = isManualRefreshing || isFetchingHistory || isFetchingQuote;

  // Synchronize canonical ticker if backend resolved bare symbol or alias (e.g. SJVN -> SJVN.NS or RATTANINDIA POWER -> RTNPOWER.NS)
  useEffect(() => {
    const canonical = quote?.ticker || history?.ticker;
    if (canonical && canonical !== selectedTicker) {
      setSelectedTicker(canonical);
    }
  }, [quote?.ticker, history?.ticker, selectedTicker, setSelectedTicker]);

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

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    // 1. If searchResults has already loaded, match exact ticker or best company name
    if (searchResults && searchResults.length > 0) {
      const match = searchResults.find(
        (s) =>
          s.ticker.toUpperCase() === query.toUpperCase() ||
          s.ticker.split(".")[0].toUpperCase() === query.toUpperCase() ||
          s.company_name.toLowerCase().includes(query.toLowerCase())
      ) || searchResults[0];
      handleSelectTicker(match.ticker);
      return;
    }

    // 2. Dynamically resolve any company name or query via the Security Master
    try {
      const resolved = await resolveStockApi(query);
      if (resolved && resolved.ticker) {
        handleSelectTicker(resolved.ticker);
        return;
      }
    } catch {
      // Fall through
    }

    // Clean ticker: no spaces allowed in valid tickers
    const cleanSym = query.replace(/\s+/g, "").toUpperCase();
    handleSelectTicker(cleanSym.includes(".") ? cleanSym : `${cleanSym}.NS`);
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
      `${txData.action} ${txData.shares} ${txData.ticker} executed at ${formatStock(txData.price, txData.ticker)}.`
    );
  };

  const isCurrentInWatchlist = watchlist.includes(selectedTicker);

  // Calculate fundamental statistics from history & quote
  const currentPrice = quote?.current_price || (history?.data?.length ? history.data[history.data.length - 1].close : 0);
  const effectiveCurrency =
    quote?.currency ||
    history?.currency ||
    getStockNativeCurrency(selectedTicker);

  const effectiveExchange =
    quote?.exchange ||
    (selectedTicker.endsWith(".NS") || effectiveCurrency === "INR"
      ? "NSE"
      : selectedTicker.endsWith(".BO")
      ? "BSE"
      : "NASDAQ/NYSE");

  const change = quote?.change ?? (history?.data?.length > 1 && history.data[0].open ? currentPrice - history.data[0].open : 0);
  const changePercent = quote?.change_percent ?? (history?.data?.length > 1 && history.data[0].open ? ((currentPrice - history.data[0].open) / history.data[0].open) * 100 : 0);
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

  // Intraday 1-Day Session Analytics
  const intradayStats = React.useMemo(() => {
    const candles = history?.data || [];
    if (!candles.length || selectedTimeframe.days !== 1) {
      return null;
    }

    const firstCandle = candles[0];
    const lastCandle = candles[candles.length - 1];
    const open = firstCandle.open ?? currentPrice;
    const close = lastCandle.close ?? currentPrice;

    const highs = candles.map((c) => c.high || c.close);
    const lows = candles.map((c) => c.low || c.close);
    const volumes = candles.map((c) => c.volume || 0);

    const dayHigh = Math.max(...highs);
    const dayLow = Math.min(...lows);
    const totalVolume = volumes.reduce((a, b) => a + b, 0);

    // Volume-Weighted Average Price (VWAP)
    let vwapNumerator = 0;
    let vwapDenominator = 0;
    candles.forEach((c) => {
      const typicalPrice = ((c.high || c.close) + (c.low || c.close) + (c.close || c.open)) / 3;
      const vol = c.volume || 0;
      vwapNumerator += typicalPrice * vol;
      vwapDenominator += vol;
    });
    const vwap = vwapDenominator > 0 ? vwapNumerator / vwapDenominator : (dayHigh + dayLow) / 2;

    // Day Range percentage position of current price
    const rangeSpan = dayHigh - dayLow;
    const rangePositionPct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((close - dayLow) / rangeSpan) * 100)) : 50;

    // Intraday Spread / Volatility
    const intradaySpreadPct = dayLow > 0 ? ((dayHigh - dayLow) / dayLow) * 100 : 0;

    // Opening Gap
    const prevClose = quote?.previous_close || open;
    const gapAmount = open - prevClose;
    const gapPct = prevClose > 0 ? (gapAmount / prevClose) * 100 : 0;

    // Intraday Bias
    const isAboveVwap = close >= vwap;
    const isAboveOpen = close >= open;
    let bias = "Consolidating / Neutral";
    let biasColor = "text-slate-300";
    if (isAboveVwap && isAboveOpen) {
      bias = "Bullish Momentum (Above VWAP & Open)";
      biasColor = "text-brand-emerald";
    } else if (!isAboveVwap && !isAboveOpen) {
      bias = "Bearish Pressure (Below VWAP & Open)";
      biasColor = "text-brand-red";
    }

    return {
      open,
      close,
      dayHigh,
      dayLow,
      totalVolume,
      vwap,
      rangePositionPct,
      intradaySpreadPct,
      gapAmount,
      gapPct,
      bias,
      biasColor,
      candlesCount: candles.length,
    };
  }, [history?.data, selectedTimeframe.days, currentPrice, quote?.previous_close]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8 space-y-6">
      {/* Top Search & Discovery Command Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {/* Search Input with Autocomplete */}
        <div ref={searchContainerRef} className="relative w-full lg:w-[420px] xl:w-[480px] shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute left-3.5 inset-y-0 flex items-center justify-center pointer-events-none">
              <Search className="w-4 h-4 text-brand-textMuted" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search ticker or company (e.g. AAPL, NVDA, RELIANCE)..."
              className="w-full bg-brand-surface border border-white/10 hover:border-white/20 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-brand-textMuted focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/40 transition-all shadow-inner"
            />
            {isSearching ? (
              <div className="absolute right-3.5 inset-y-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-4 h-4 text-brand-emerald animate-spin origin-center" />
              </div>
            ) : searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-3.5 inset-y-0 flex items-center justify-center text-brand-textMuted hover:text-white text-xs p-1"
              >
                ✕
              </button>
            ) : null}
          </form>

          {/* Autocomplete Dropdown Menu */}
          {isSearchOpen && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-[#0d131f] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-white/5 backdrop-blur-xl">
              {searchInput.trim().length === 0 ? (
                /* Recent / Popular Quick-Picks when focused but empty */
                <div className="p-3 space-y-2">
                  <div className="px-1 text-[10px] font-bold text-brand-textMuted uppercase tracking-wider flex items-center justify-between">
                    <span>Popular Market Assets</span>
                    <span>Quick Select</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POPULAR_TICKERS.slice(0, 8).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectTicker(t)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-brand-emerald/15 hover:border-brand-emerald/30 border border-white/5 text-left text-xs font-semibold text-white flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <span className="font-mono text-brand-emerald group-hover:scale-105 transition-transform">{t}</span>
                        <span className="text-[10px] text-brand-textMuted group-hover:text-white">Explore →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : isSearching && (!searchResults || searchResults.length === 0) ? (
                <div className="p-4 text-center text-xs text-brand-textMuted flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-brand-emerald animate-spin" />
                  <span>Searching global & Indian equity markets for "{searchInput}"...</span>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <>
                  <div className="px-3.5 py-1.5 bg-white/5 flex items-center justify-between text-[10px] font-bold text-brand-textMuted uppercase tracking-wider">
                    <span>Matching Shares ({searchResults.length})</span>
                    <span>Live Exchange Results</span>
                  </div>
                  {searchResults.map((stock) => {
                    const isIndian = stock.ticker.endsWith(".NS") || stock.ticker.endsWith(".BO") || stock.currency === "INR" || stock.exchange === "NSE" || stock.exchange === "BSE";
                    const exchLabel = stock.exchange || (stock.ticker.endsWith(".NS") ? "NSE" : stock.ticker.endsWith(".BO") ? "BSE" : "US");
                    const rawSymbol = stock.ticker.split(".")[0];
                    return (
                      <button
                        key={stock.ticker}
                        onClick={() => handleSelectTicker(stock.ticker)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left cursor-pointer group border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex flex-col min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-xs group-hover:text-brand-emerald transition-colors font-mono">
                              {stock.ticker}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono ${
                                isIndian
                                  ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                                  : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              {exchLabel}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                isIndian ? "bg-emerald-500/10 text-brand-emerald" : "bg-slate-700/50 text-slate-300"
                              }`}
                            >
                              {isIndian ? "₹ INR" : "$ USD"}
                            </span>
                          </div>
                          <span className="text-xs text-brand-textSecondary group-hover:text-slate-200 transition-colors truncate mt-0.5 font-medium">
                            {stock.company_name}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 text-[11px] text-brand-textMuted group-hover:text-brand-emerald transition-colors font-mono">
                          <span>{rawSymbol}</span>
                          <span>→</span>
                        </div>
                      </button>
                    );
                  })}
                  {!searchInput.includes(" ") && searchInput.trim().length <= 10 && (
                    <button
                      onClick={() => handleSelectTicker(searchInput.trim().toUpperCase())}
                      className="w-full px-4 py-2.5 bg-brand-surface/70 hover:bg-brand-emerald/15 text-left text-xs font-semibold text-brand-cyan hover:text-white flex items-center justify-between transition-colors cursor-pointer border-t border-white/10"
                    >
                      <span>Explore ticker symbol <strong>"{searchInput.trim().toUpperCase()}"</strong> directly</span>
                      <span>→</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="p-4 text-center space-y-2">
                  <div className="text-xs text-brand-textMuted">
                    No instant match for "{searchInput}".
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const direct = await searchStocksApi(searchInput.trim());
                        if (direct && direct.length > 0) {
                          handleSelectTicker(direct[0].ticker);
                          return;
                        }
                      } catch {}
                      handleSelectTicker(searchInput.trim().toUpperCase());
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-emerald/20 hover:bg-brand-emerald/30 text-brand-emerald border border-brand-emerald/40 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Search Exchanges for "{searchInput.trim()}"</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Ticker Chips with accessible horizontal scroll */}
        <div className="relative min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
          <button
            type="button"
            onClick={() => scrollTrending("left")}
            className="hidden sm:flex p-1.5 rounded-xl bg-brand-surface/90 hover:bg-white/10 border border-white/10 hover:border-white/20 text-brand-textMuted hover:text-white transition-all shrink-0 cursor-pointer shadow-sm z-10"
            title="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={trendingRef}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar min-w-0 flex-1 justify-start scroll-smooth"
          >
            <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <span>Trending:</span>
            </span>
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t}
                onClick={() => handleSelectTicker(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedTicker === t
                    ? "bg-brand-emerald text-brand-bg font-bold shadow-emeraldGlow scale-105"
                    : "bg-brand-surface text-brand-textSecondary hover:text-white border border-white/5 hover:border-white/20"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollTrending("right")}
            className="hidden sm:flex p-1.5 rounded-xl bg-brand-surface/90 hover:bg-white/10 border border-white/10 hover:border-white/20 text-brand-textMuted hover:text-white transition-all shrink-0 cursor-pointer shadow-sm z-10"
            title="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 12-Column Responsive Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Primary Chart Card + AI Forecast Insights */}
        <div className="lg:col-span-8 space-y-6">
          {/* Primary Stock Detail & Chart Card */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-5 border border-white/10 shadow-cardGlass">
            {/* Ticker Header & Live Quote */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {quote?.company_name || history?.company_name || selectedTicker}
                  </h2>
                  <span className="font-mono font-bold text-xs text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/25 px-2 py-0.5 rounded-md">
                    {quote?.ticker || history?.ticker || selectedTicker}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider font-mono ${
                      effectiveExchange === "NSE"
                        ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                        : effectiveExchange === "BSE"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {effectiveExchange}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-brand-textMuted border border-white/5">
                    {effectiveCurrency}
                  </span>
                  {(quote?.sector || history?.sector) && (
                    <span className="text-[10px] text-brand-textMuted bg-brand-surface px-2.5 py-0.5 rounded-md border border-white/5">
                      {quote?.sector || history?.sector}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    {currentPrice ? formatStock(currentPrice, selectedTicker, 2, effectiveCurrency) : "---"}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg ${
                      isUp ? "bg-emerald-500/10 text-brand-emerald" : "bg-red-500/10 text-brand-red"
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span>
                      {isUp ? "+" : ""}
                      {formatStock(change, selectedTicker, 2, effectiveCurrency)} ({isUp ? "+" : ""}
                      {changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    quoteError || historyError
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : quote?.source === "live"
                      ? "bg-emerald-500/10 text-brand-emerald border-brand-emerald/30 shadow-sm"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {quoteError || historyError
                    ? "● Unavailable"
                    : quote?.source === "live"
                    ? "● Live Stream"
                    : "Cached DB"}
                </span>
                <span className="text-[10px] text-brand-textMuted flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {quote?.latest_trading_date || "Market Close"}
                </span>
              </div>
            </div>

            {/* Timeframe Selectors */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1 bg-brand-surface p-1 rounded-2xl border border-white/5 overflow-x-auto">
                {TIMEFRAMES.map((tf) => {
                  const isSelected = selectedTimeframe.days === tf.days;
                  return (
                    <button
                      key={tf.label}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
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

              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-brand-textMuted font-mono">
                  {selectedTimeframe.label === "1D" ? (
                    <>
                      <span className="flex items-center gap-1.5 text-brand-emerald">
                        <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
                        5-Min Live Session
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-brand-textSecondary">Auto-sync 5m</span>
                    </>
                  ) : (
                    <>
                      <span>OHLCV Daily Bars</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-brand-emerald font-semibold">Auto-sync 5m</span>
                    </>
                  )}
                  {lastRefreshedAt && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/20 hidden md:inline-block" />
                      <span className="text-[10px] text-brand-textMuted hidden md:inline-block">
                        Updated {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </>
                  )}
                </div>

                {/* Instant Manual Refresh Button */}
                <button
                  onClick={handleInstantRefresh}
                  disabled={isRefreshingChart}
                  title="Instant refresh chart & quotes (Background auto-refreshes every 5 mins)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-surface hover:bg-brand-emerald/10 border border-brand-emerald/30 hover:border-brand-emerald/60 text-brand-emerald text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingChart ? "animate-spin" : ""}`} />
                  <span>{isRefreshingChart ? "Refreshing..." : "Refresh Chart"}</span>
                </button>
              </div>
            </div>

            {/* Interactive Stock Chart (Recharts) */}
            <div className="pt-2">
              <StockChart
                data={history?.data || []}
                ticker={selectedTicker}
                timeframe={selectedTimeframe.label}
                previousClose={quote?.previous_close}
                currentPrice={currentPrice}
                lastRefreshedAt={lastRefreshedAt}
                currency={effectiveCurrency}
                isLoading={isLoadingHistory}
                error={historyError}
                onRetry={handleInstantRefresh}
                onSelectTicker={handleSelectTicker}
              />
            </div>

            {/* Dedicated 1-Day Intraday Session Analysis */}
            {selectedTimeframe.label === "1D" && intradayStats && (
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-emerald" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      1-Day Session Intelligence & Analytics
                    </h4>
                  </div>
                  <span className="text-[10px] text-brand-textMuted font-mono">
                    {intradayStats.candlesCount} Intraday Intervals (5m)
                  </span>
                </div>

                {/* Day Range Needle Visualizer */}
                <div className="p-4 rounded-2xl bg-brand-surface/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-brand-textMuted text-[11px] font-medium">Day Range</span>
                    <span className="text-[11px] text-brand-textSecondary font-mono">
                      Current: <span className="text-white font-bold">{formatStock(currentPrice, selectedTicker)}</span> ({intradayStats.rangePositionPct.toFixed(0)}% of range)
                    </span>
                  </div>

                  {/* Visual Slider Bar */}
                  <div className="relative pt-1 pb-1">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full"
                        style={{ width: "100%" }}
                      />
                    </div>
                    {/* Needle Marker */}
                    <div
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${intradayStats.rangePositionPct}%` }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-emeraldGlow border-2 border-brand-bg animate-pulse" />
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] font-mono pt-1">
                    <span className="text-brand-textMuted">
                      Low: <span className="text-red-400 font-bold">{formatStock(intradayStats.dayLow, selectedTicker, 2, quote?.currency)}</span>
                    </span>
                    <span className="text-brand-textMuted">
                      High: <span className="text-brand-emerald font-bold">{formatStock(intradayStats.dayHigh, selectedTicker, 2, quote?.currency)}</span>
                    </span>
                  </div>
                </div>

                {/* 4-Column Intraday Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                    <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                      Session Open
                    </span>
                    <div className="font-bold text-white text-xs mt-1 font-mono">
                      {formatStock(intradayStats.open, selectedTicker, 2, quote?.currency)}
                    </div>
                    <span className="text-[10px] text-brand-textMuted block mt-0.5 font-mono">
                      {intradayStats.gapPct >= 0 ? "+" : ""}{intradayStats.gapPct.toFixed(2)}% gap
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                    <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                      Intraday VWAP
                    </span>
                    <div className="font-bold text-brand-cyan text-xs mt-1 font-mono">
                      {formatStock(intradayStats.vwap, selectedTicker, 2, quote?.currency)}
                    </div>
                    <span className="text-[10px] text-brand-textMuted block mt-0.5">
                      Benchmark price
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                    <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                      Intraday Spread
                    </span>
                    <div className="font-bold text-white text-xs mt-1 font-mono">
                      {intradayStats.intradaySpreadPct.toFixed(2)}%
                    </div>
                    <span className="text-[10px] text-brand-textMuted block mt-0.5">
                      Session volatility
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                    <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                      Intraday Bias
                    </span>
                    <div className={`font-bold text-xs mt-1 truncate ${intradayStats.biasColor}`}>
                      {intradayStats.bias}
                    </div>
                    <span className="text-[10px] text-brand-textMuted block mt-0.5">
                      Price vs VWAP
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Fundamental Market Intelligence Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-xs">
              <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                  52W Range
                </span>
                <div className="font-bold text-white text-xs mt-1 font-mono">
                  {formatStock(stats.low52, selectedTicker, 2, quote?.currency)} - {formatStock(stats.high52, selectedTicker, 2, quote?.currency)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                  Latest Volume
                </span>
                <div className="font-bold text-white text-xs mt-1 font-mono">
                  {stats.latestVolume ? stats.latestVolume.toLocaleString() : "---"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                  Average Volume
                </span>
                <div className="font-bold text-white text-xs mt-1 font-mono">
                  {stats.avgVolume ? stats.avgVolume.toLocaleString() : "---"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-surface/70 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
                  Prev Close
                </span>
                <div className="font-bold text-white text-xs mt-1 font-mono">
                  {quote?.previous_close ? formatStock(quote.previous_close, selectedTicker, 2, quote?.currency) : "---"}
                </div>
              </div>
            </div>
          </div>

          {/* Deep Neural Forecast Callout Card */}
          <div className="glass-panel rounded-3xl p-5 md:p-6 border border-brand-emerald/30 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 space-y-3 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-emerald/10 text-brand-emerald shadow-emeraldGlow">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Equitix Machine Learning Intelligence</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-emerald/20 text-brand-emerald font-extrabold tracking-wider">
                      7-DAY HORIZON
                    </span>
                  </h3>
                  <span className="text-[11px] text-brand-textSecondary block">
                    Walk-Forward Multi-Output Neural Network Inference
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("models")}
                className="text-xs text-brand-emerald hover:text-white flex items-center gap-1 font-bold transition-colors cursor-pointer bg-brand-emerald/10 hover:bg-brand-emerald/20 px-3 py-1.5 rounded-xl border border-brand-emerald/20"
              >
                <span>View Predictions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {mlForecast ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                  <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Directional Bias</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                        mlForecast.sentiment === "Bullish"
                          ? "bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30"
                          : mlForecast.sentiment === "Bearish"
                          ? "bg-red-500/10 text-brand-red border border-brand-red/30"
                          : "bg-blue-500/10 text-brand-cyan border border-brand-cyan/30"
                      }`}
                    >
                      {mlForecast.sentiment}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        mlForecast.diffPct >= 0 ? "text-brand-emerald" : "text-brand-red"
                      }`}
                    >
                      {mlForecast.diffPct >= 0 ? "+" : ""}
                      {mlForecast.diffPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                  <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Target Price (T+7)</span>
                  <div className="mt-1 text-sm font-black text-white font-mono">
                    {formatStock(mlForecast.targetPrice, selectedTicker)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                  <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Inference Model</span>
                  <div className="mt-1 text-xs font-bold text-brand-cyan truncate font-mono">
                    {mlForecast.modelName || "Deep LSTM"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-brand-textMuted">
                <span>Deep LSTM batch inference generating daily forecasts.</span>
                <span className="text-[10px] text-brand-emerald font-semibold">Active Cron</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column (4 cols): Quick Trade + Watchlist + FX Rates */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Trade / Action Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-5 border border-white/10 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-brand-emerald">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Order Execution
                </h3>
              </div>
              <span className="text-[10px] text-brand-emerald bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                Paper Trading
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-brand-surface/80 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-textMuted">Selected Asset</span>
                <span className="font-extrabold text-white font-mono">{selectedTicker}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-textMuted">Live Price</span>
                <span className="font-extrabold text-white font-mono">
                  {currentPrice ? formatStock(currentPrice, selectedTicker, 2, quote?.currency) : "---"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                <span className="text-brand-textMuted">Active Portfolio</span>
                <span className="text-brand-textSecondary truncate max-w-[140px] text-right font-medium">
                  {portfolio?.name || "Primary Portfolio"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-textMuted">Available Cash</span>
                <span className="font-bold text-brand-emerald font-mono">
                  {formatPortfolio(portfolio?.cash_balance || 0, "INR")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => setIsTxModalOpen(true)}
                disabled={!currentPrice || quoteError || historyError}
                className="w-full btn-emerald-glow py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-emeraldGlow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{!currentPrice || quoteError || historyError ? "Asset Unavailable" : `Buy ${selectedTicker}`}</span>
              </button>

              <button
                onClick={() => toggleWatchlist(selectedTicker)}
                className={`w-full py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                <span>{isCurrentInWatchlist ? "Saved in Watchlist" : "+ Add to Watchlist"}</span>
              </button>
            </div>
          </div>

          {/* Saved Watchlist Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                Saved Watchlist ({watchlist.length})
              </h3>
              <span className="text-[10px] text-brand-textMuted font-mono">Click to inspect</span>
            </div>

            {watchlist.length === 0 ? (
              <div className="text-center py-6 text-xs text-brand-textMuted">
                No stocks pinned yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {watchlist.map((t) => {
                  const isSelected = selectedTicker === t;
                  return (
                    <div
                      key={t}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-brand-card border-brand-emerald/40 text-brand-emerald shadow-sm"
                          : "bg-brand-surface/70 border-white/5 text-white hover:border-white/20 hover:bg-brand-surface"
                      }`}
                    >
                      <button
                        onClick={() => handleSelectTicker(t)}
                        className="flex-1 flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs font-mono">{t}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-brand-textMuted uppercase font-mono">
                          {t.endsWith(".NS") ? "NSE" : "US"}
                        </span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(t);
                        }}
                        className="ml-2 p-1 text-brand-textMuted hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove from watchlist"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Currency & FX Rates Intelligence Card */}
          <div className="bg-[#0d131f] rounded-3xl p-6 space-y-3 border border-white/15 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-4 h-4 text-brand-cyan" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Global Forex Stream
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshRates();
                  toast.info("Forex Syncing", "Refreshing real-time currency conversion rates...");
                }}
                title="Refresh Live Forex Rates"
                className="p-1 hover:text-white transition-colors cursor-pointer text-brand-textMuted hover:bg-white/10 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingForex ? "animate-spin text-brand-cyan" : ""}`} />
                <span>Sync</span>
              </button>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-200">USD / INR</span>
                  <span className="text-[10px] text-brand-textMuted">Live FX</span>
                </div>
                <span className="font-mono font-bold text-brand-emerald">
                  ₹{rates?.INR ? (rates.INR).toFixed(2) : "96.28"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-200">EUR / USD</span>
                  <span className="text-[10px] text-brand-textMuted">Live FX</span>
                </div>
                <span className="font-mono font-bold text-brand-cyan">
                  ${rates?.EUR ? (1 / rates.EUR).toFixed(4) : "1.0850"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-200">GBP / USD</span>
                  <span className="text-[10px] text-brand-textMuted">Live FX</span>
                </div>
                <span className="font-mono font-bold text-brand-cyan">
                  ${rates?.GBP ? (1 / rates.GBP).toFixed(4) : "1.2980"}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-brand-textMuted pt-1 flex items-center justify-between font-mono">
              <span>Display: {currentConfig?.flag} {currentConfig?.code}</span>
              <span className="text-brand-textMuted text-[9px]">Live Rates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal Connected with Active Portfolio */}
      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          portfolioId={activePortfolioId}
          cashBalance={portfolio?.cash_balance || 0}
          holdings={portfolio?.holdings || []}
          initialTicker={selectedTicker}
          initialAction="BUY"
          initialPrice={currentPrice ? Number(currentPrice).toFixed(2) : undefined}
          onExecute={handleExecuteTx}
          isExecuting={isExecutingTx}
          error={txError}
        />
      )}
    </div>
  );
};
