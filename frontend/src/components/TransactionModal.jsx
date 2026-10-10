import React, { useState, useEffect } from "react";
import { X, ArrowDownRight, ArrowUpRight, Loader2, AlertCircle, Sparkles, Moon } from "lucide-react";
import { useCurrency, convertCurrency, getStockNativeCurrency } from "../utils/currency";
import { useStockQuote } from "../hooks/useStocks";
import { calculateMarketStatus } from "../utils/marketSchedule";

export const TransactionModal = ({
  isOpen,
  onClose,
  portfolioId,
  cashBalance = 0,
  holdings = [],
  initialTicker = "RELIANCE.NS",
  initialAction = "BUY",
  initialPrice = null,
  initialShares = null,
  onExecute,
  isExecuting,
  error,
}) => {
  const { formatPortfolio, formatStock, symbol, currency: portfolioCurrency } = useCurrency();
  const [ticker, setTicker] = useState(initialTicker);
  const [action, setAction] = useState(initialAction);
  const [shares, setShares] = useState(initialShares ? String(initialShares) : "10");
  const [price, setPrice] = useState(initialPrice ? String(Number(initialPrice).toFixed(2)) : "0.00");
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState(false);
  const [localError, setLocalError] = useState("");

  // Live quote query for real-time market price locking
  const { data: quote, isFetching: isFetchingQuote } = useStockQuote(ticker);

  // Live market status for the ticker
  const marketStatus = React.useMemo(() => {
    return calculateMarketStatus(ticker);
  }, [ticker]);

  // Lock body scroll when modal is open to avoid scrolled background artifacts
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const activeTicker = (initialTicker || "RELIANCE.NS").toUpperCase().trim();
      const activeAction = initialAction || "BUY";
      setTicker(activeTicker);
      setAction(activeAction);

      const holding = holdings?.find(
        (h) => h.ticker?.toUpperCase() === activeTicker
      );

      // Price initialization from holding or prop
      if (initialPrice !== null && initialPrice !== undefined && Number(initialPrice) > 0) {
        setPrice(Number(initialPrice).toFixed(2));
      } else if (holding?.current_price && Number(holding.current_price) > 0) {
        setPrice(Number(holding.current_price).toFixed(2));
      } else if (holding?.average_price && Number(holding.average_price) > 0) {
        setPrice(Number(holding.average_price).toFixed(2));
      }

      // Shares initialization
      if (initialShares !== null && initialShares !== undefined && Number(initialShares) > 0) {
        setShares(String(initialShares));
      } else if (activeAction === "SELL" && holding?.shares) {
        setShares(String(holding.shares));
      } else {
        setShares("10");
      }

      setLocalError("");
      setIsPriceManuallyEdited(false);
    }
  }, [isOpen, initialTicker, initialAction, initialPrice, initialShares, holdings]);

  // Derive real-time market price converted to active display currency
  const liveMarketPrice = React.useMemo(() => {
    if (quote?.current_price && quote.current_price > 0) {
      const nativeCurr = getStockNativeCurrency(ticker, quote.currency);
      const converted = convertCurrency(quote.current_price, nativeCurr, portfolioCurrency || "INR");
      return Number(converted).toFixed(2);
    }
    return null;
  }, [quote?.current_price, quote?.currency, ticker, portfolioCurrency]);

  // Default execution price to live market price as soon as quote arrives, unless user manually edited it
  useEffect(() => {
    if (liveMarketPrice && !isPriceManuallyEdited) {
      setPrice(liveMarketPrice);
    }
  }, [liveMarketPrice, isPriceManuallyEdited]);

  if (!isOpen) return null;

  // Holding matching the active ticker
  const currentHolding = holdings?.find(
    (h) => h.ticker?.toUpperCase() === ticker?.toUpperCase().trim()
  );
  const ownedShares = currentHolding ? Number(currentHolding.shares) || 0 : 0;

  const sharesNum = Number(shares) || 0;
  const priceNum = Number(price) || 0;
  const totalValue = sharesNum * priceNum;

  // Max Calculations
  const maxAffordableBuy = priceNum > 0 ? Math.floor(cashBalance / priceNum) : 0;
  const maxSelectableShares = action === "BUY" ? maxAffordableBuy : ownedShares;

  const isInsufficientCash = action === "BUY" && totalValue > cashBalance;
  const isOverOwnedShares = action === "SELL" && sharesNum > ownedShares;
  const isZeroOwnedShares = action === "SELL" && ownedShares <= 0;
  const isInvalidAmount = isNaN(sharesNum) || sharesNum <= 0;

  // Handle Max selection
  const handleSetMax = () => {
    setLocalError("");
    if (action === "BUY") {
      if (maxAffordableBuy <= 0) {
        setLocalError("Insufficient portfolio cash to buy any shares at current price.");
        setShares("0");
        return;
      }
      setShares(String(maxAffordableBuy));
    } else {
      if (ownedShares <= 0) {
        setLocalError(`You do not own any shares of ${ticker.toUpperCase().trim()} in this portfolio.`);
        setShares("0");
        return;
      }
      setShares(String(ownedShares));
    }
  };

  // Handle Percentage Quick Fill: 25%, 50%, 75%, 100%
  const handleSetPercentage = (pct) => {
    setLocalError("");
    if (pct === 100) {
      handleSetMax();
      return;
    }

    if (action === "BUY") {
      if (maxAffordableBuy <= 0) {
        setShares("0");
        return;
      }
      const calculated = Math.floor(maxAffordableBuy * (pct / 100));
      setShares(String(Math.max(calculated, 1)));
    } else {
      if (ownedShares <= 0) {
        setShares("0");
        return;
      }
      const raw = ownedShares * (pct / 100);
      const val = Number.isInteger(ownedShares)
        ? Math.max(1, Math.floor(raw))
        : Math.round(raw * 100) / 100;
      setShares(String(val));
    }
  };

  // Switch between BUY and SELL mode
  const handleActionChange = (newAction) => {
    setAction(newAction);
    setLocalError("");
    const holding = holdings?.find(
      (h) => h.ticker?.toUpperCase() === ticker?.toUpperCase().trim()
    );
    if (newAction === "SELL") {
      if (holding?.shares) {
        setShares(String(holding.shares));
      } else {
        setShares("0");
      }
      if (holding?.current_price) {
        setPrice(Number(holding.current_price).toFixed(2));
      }
    } else {
      if (shares === "0" || Number(shares) > maxAffordableBuy) {
        setShares(String(Math.min(10, Math.max(1, maxAffordableBuy))));
      }
    }
  };

  // Select a ticker from chips
  const handleSelectTicker = (selectedTicker) => {
    const sym = selectedTicker.toUpperCase().trim();
    setTicker(sym);
    setIsPriceManuallyEdited(false);
    setLocalError("");
    const holding = holdings?.find((h) => h.ticker?.toUpperCase() === sym);
    if (holding?.current_price) {
      setPrice(Number(holding.current_price).toFixed(2));
    }
    if (action === "SELL") {
      if (holding) {
        setShares(String(holding.shares));
      } else {
        setShares("0");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!ticker.trim()) {
      setLocalError("Please enter a valid stock ticker symbol.");
      return;
    }

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setLocalError("Shares count must be a positive number.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setLocalError(`Execution price must be a positive ${symbol} amount.`);
      return;
    }

    if (action === "BUY" && totalValue > cashBalance) {
      setLocalError(
        `Insufficient funds: Portfolio cash is ${formatPortfolio(cashBalance)}, order requires ${formatPortfolio(totalValue)}`
      );
      return;
    }

    if (action === "SELL") {
      if (ownedShares <= 0) {
        setLocalError(`You do not own any shares of ${ticker.toUpperCase().trim()} in this portfolio to sell.`);
        return;
      }
      if (sharesNum > ownedShares) {
        setLocalError(
          `Cannot sell ${sharesNum} shares: You only own ${ownedShares} shares of ${ticker.toUpperCase().trim()}.`
        );
        return;
      }
    }

    try {
      await onExecute({
        portfolioId,
        ticker: ticker.toUpperCase().trim(),
        action,
        shares: sharesNum,
        price: priceNum,
      });
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-cardGlass relative border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Execute Simulated Order</span>
              {action === "SELL" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-brand-red font-mono font-bold border border-red-500/30">
                  SELL
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-brand-emerald font-mono font-bold border border-brand-emerald/30">
                  BUY
                </span>
              )}
            </h3>
            <p className="text-[11px] text-brand-textMuted">Instantly trade stocks with simulated paper cash</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Context Banner: Cash & Position */}
        <div className="my-4 p-3 rounded-2xl bg-brand-surface border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-textSecondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
              Available Portfolio Cash
            </span>
            <span className="font-mono font-bold text-brand-emerald">{formatPortfolio(cashBalance)}</span>
          </div>

          {action === "SELL" ? (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-red" />
                <span className="text-brand-textSecondary">
                  Position in <span className="font-mono text-white font-bold">{ticker || "Stock"}</span>:
                </span>
                <span className="font-mono font-bold text-white">
                  {ownedShares} {ownedShares === 1 ? "Share" : "Shares"}
                </span>
              </div>
              {ownedShares > 0 ? (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/15 hover:bg-brand-red text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer"
                  title="Choose maximum owned shares"
                >
                  Max: {ownedShares}
                </button>
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold">0 Owned</span>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-brand-textSecondary text-[11px]">
                Max Purchasing Power:
              </span>
              {maxAffordableBuy > 0 ? (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 hover:bg-brand-emerald text-brand-emerald hover:text-black border border-brand-emerald/30 transition-all cursor-pointer font-mono"
                  title="Choose maximum affordable shares"
                >
                  Max: {maxAffordableBuy} Shares
                </button>
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold font-mono">0 Shares</span>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {(localError || error) && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action switcher: BUY vs SELL */}
          <div className="grid grid-cols-2 gap-2 bg-brand-surface p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => handleActionChange("BUY")}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                action === "BUY"
                  ? "bg-brand-emerald text-brand-bg shadow-sm"
                  : "text-brand-textMuted hover:text-white"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>BUY (Long)</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionChange("SELL")}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                action === "SELL"
                  ? "bg-brand-red text-white shadow-sm"
                  : "text-brand-textMuted hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>SELL (Exit)</span>
            </button>
          </div>

          {/* Ticker Symbol */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider">
                Stock Ticker
              </label>
              {action === "SELL" && (
                <span className="text-[10px] text-brand-textMuted font-mono">
                  {ownedShares > 0 ? `Owned: ${ownedShares}` : "Not in portfolio"}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-brand-surface border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-brand-emerald"
              />
            </div>

            {/* Quick ticker selection chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {action === "SELL" && holdings && holdings.length > 0 ? (
                holdings.map((h) => {
                  const isSelected = ticker === h.ticker;
                  return (
                    <button
                      type="button"
                      key={h.ticker}
                      onClick={() => handleSelectTicker(h.ticker)}
                      className={`px-2.5 py-1 text-xs rounded-xl border transition-all cursor-pointer font-mono ${
                        isSelected
                          ? "bg-red-500/20 border-brand-red text-white font-bold shadow-sm"
                          : "bg-brand-surface border-white/10 text-brand-textSecondary hover:text-white hover:border-white/20"
                      }`}
                    >
                      {h.ticker} <span className="text-[10px] opacity-75">({h.shares})</span>
                    </button>
                  );
                })
              ) : (
                ["RELIANCE.NS", "TCS.NS", "INFY.NS", "AAPL", "NVDA"].map((t) => {
                  const isSelected = ticker === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => handleSelectTicker(t)}
                      className={`px-2.5 py-1 text-xs rounded-xl border transition-all cursor-pointer font-mono ${
                        isSelected
                          ? "bg-brand-emerald/20 border-brand-emerald text-brand-emerald font-bold"
                          : "bg-brand-surface border-white/10 text-brand-textSecondary hover:text-white hover:border-white/20"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Shares and Price Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider">
                  Shares Count
                </label>
                {/* Clickable Max link in label */}
                {maxSelectableShares > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[10px] font-bold text-brand-emerald hover:underline cursor-pointer flex items-center gap-0.5"
                    title={`Click to set maximum (${maxSelectableShares})`}
                  >
                    <span>Max: {maxSelectableShares}</span>
                  </button>
                )}
              </div>

              {/* Input with embedded MAX button */}
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={shares}
                  onChange={(e) => {
                    setShares(e.target.value);
                    setLocalError("");
                  }}
                  placeholder="0"
                  className={`w-full bg-brand-surface border rounded-xl pl-3.5 pr-14 py-2 text-sm text-white font-mono focus:outline-none transition-colors ${
                    isOverOwnedShares || isInsufficientCash
                      ? "border-red-500/80 focus:border-red-500"
                      : "border-white/10 focus:border-brand-emerald"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSetMax}
                  disabled={maxSelectableShares <= 0}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    action === "BUY"
                      ? "bg-brand-emerald/15 hover:bg-brand-emerald text-brand-emerald hover:text-black border border-brand-emerald/30"
                      : "bg-red-500/15 hover:bg-brand-red text-red-400 hover:text-white border border-red-500/30"
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Choose maximum of what I have"
                >
                  MAX
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider">
                  Execution Price ({symbol})
                </label>
                {isPriceManuallyEdited ? (
                  <span className="text-[10px] text-brand-cyan font-semibold flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                    Custom / Historical
                  </span>
                ) : !marketStatus.isOpen ? (
                  <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Last Close (Market Closed)
                  </span>
                ) : (
                  <span className="text-[10px] text-brand-emerald font-semibold flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
                    Live Market (Default)
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted font-mono font-bold text-sm pointer-events-none">
                  {symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  required
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setIsPriceManuallyEdited(true);
                    setLocalError("");
                  }}
                  placeholder="0.00"
                  className="w-full bg-brand-surface border border-white/10 rounded-xl pl-8 pr-24 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-brand-emerald transition-colors"
                />
                {liveMarketPrice && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrice(liveMarketPrice);
                      setIsPriceManuallyEdited(false);
                      setLocalError("");
                    }}
                    title="Click to snap to current live exchange price"
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      !isPriceManuallyEdited
                        ? !marketStatus.isOpen
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/15 text-brand-emerald border border-brand-emerald/30"
                        : "bg-white/10 hover:bg-white/20 text-brand-textSecondary hover:text-white border border-white/10"
                    }`}
                  >
                    {!isPriceManuallyEdited ? (!marketStatus.isOpen ? "● CLOSE" : "● LIVE") : "SNAP CLOSE"}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-brand-textMuted mt-1">
                <span>
                  {isPriceManuallyEdited
                    ? "Custom price for past purchase simulation."
                    : !marketStatus.isOpen
                    ? "Market closed. Order price matches last official session close."
                    : "Defaults to live quote. Editable for historical buys."}
                </span>
                {liveMarketPrice && isPriceManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrice(liveMarketPrice);
                      setIsPriceManuallyEdited(false);
                      setLocalError("");
                    }}
                    className="text-brand-emerald hover:underline font-mono font-semibold cursor-pointer"
                  >
                    Live: {symbol}{Number(liveMarketPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </button>
                )}
              </div>

              {!marketStatus.isOpen && !isPriceManuallyEdited && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 mt-2 flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Market is currently closed ({marketStatus.session}). Order will execute as a paper trade at the official closing price.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Allocation Fill Percentage Bar: 25%, 50%, 75%, MAX */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-brand-surface/40 border border-white/5 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-brand-textMuted">
              <Sparkles className="w-3.5 h-3.5 text-brand-emerald/80" />
              <span className="font-medium">Quick Fill:</span>
              <span className="font-mono font-semibold text-slate-300">
                {action === "SELL" ? `${ownedShares} owned` : `${maxAffordableBuy} max`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: "25%", pct: 25 },
                { label: "50%", pct: 50 },
                { label: "75%", pct: 75 },
                { label: "MAX", pct: 100 },
              ].map((item) => {
                const isSelected =
                  maxSelectableShares > 0 &&
                  ((item.pct === 100 && Number(shares) === maxSelectableShares) ||
                    (item.pct !== 100 &&
                      Number(shares) ===
                        (action === "BUY"
                          ? Math.floor(maxAffordableBuy * (item.pct / 100))
                          : Math.floor(ownedShares * (item.pct / 100)))));

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSetPercentage(item.pct)}
                    disabled={maxSelectableShares <= 0}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer font-mono ${
                      isSelected
                        ? action === "BUY"
                          ? "bg-brand-emerald text-brand-bg font-black shadow-sm"
                          : "bg-brand-red text-white font-black shadow-sm"
                        : "bg-brand-surface border border-white/10 text-brand-textSecondary hover:text-white hover:border-white/20"
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                    title={`Fill ${item.label} of available`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline Validation Warnings */}
          {isInsufficientCash && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Order exceeds cash balance by {formatPortfolio(totalValue - cashBalance)}
              </span>
            </div>
          )}

          {isOverOwnedShares && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Cannot sell {sharesNum} shares: You only own {ownedShares} shares.
              </span>
            </div>
          )}

          {isZeroOwnedShares && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>You have 0 shares of {ticker} in this portfolio to exit.</span>
            </div>
          )}

          {/* Estimated Total Calculation & Cash Impact */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-brand-textMuted font-medium">Estimated Order Total</span>
              <span className="text-base font-bold text-white font-mono">
                {formatPortfolio(totalValue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-brand-textMuted font-mono pt-1 border-t border-white/5">
              <span>{action === "BUY" ? "Remaining Cash:" : "Proceeds to Cash:"}</span>
              <span className={action === "BUY" && isInsufficientCash ? "text-red-400 font-bold" : "text-slate-300 font-medium"}>
                {action === "BUY"
                  ? formatPortfolio(Math.max(0, cashBalance - totalValue))
                  : formatPortfolio(cashBalance + totalValue)}
              </span>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={
              isExecuting ||
              isInvalidAmount ||
              (action === "BUY" && isInsufficientCash) ||
              (action === "SELL" && (isOverOwnedShares || isZeroOwnedShares))
            }
            className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-4 cursor-pointer transition-all ${
              action === "BUY"
                ? "btn-emerald-glow"
                : "bg-brand-red text-white hover:bg-red-600 shadow-md hover:shadow-red-500/20"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Confirm {action} Order {!marketStatus.isOpen ? "(Paper Trade)" : ""}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
