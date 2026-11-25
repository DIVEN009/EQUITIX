import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Moon,
  RotateCcw,
} from "lucide-react";
import { useCurrency, convertCurrency, getStockNativeCurrency } from "../utils/currency";
import { useStockQuote } from "../hooks/useStocks";
import { calculateMarketStatus } from "../utils/marketSchedule";

const DEFAULT_TICKERS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "AAPL", "NVDA"];
const QUICK_FILL_OPTIONS = [
  { label: "25%", pct: 25 },
  { label: "50%", pct: 50 },
  { label: "75%", pct: 75 },
  { label: "MAX", pct: 100 },
];

/**
 * Normalize market session label to avoid nested parentheses such as "Closed (Pre-Open)".
 */
const formatSessionLabel = (session = "") => {
  const match = session.match(/^Closed\s*\((.+)\)$/i);
  return match ? match[1] : session;
};

const findHoldingByTicker = (holdings, sym) =>
  holdings?.find((h) => h.ticker?.toUpperCase() === sym?.toUpperCase().trim());

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
  const { formatPortfolio, symbol, currency: portfolioCurrency } = useCurrency();
  const [ticker, setTicker] = useState(initialTicker);
  const [action, setAction] = useState(initialAction);
  const [shares, setShares] = useState(initialShares ? String(initialShares) : "10");
  const [price, setPrice] = useState(initialPrice ? String(Number(initialPrice).toFixed(2)) : "0.00");
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState(false);
  const [localError, setLocalError] = useState("");

  const normalizedTicker = ticker?.toUpperCase().trim() || "";

  // Live quote query for real-time market price locking
  const { data: quote, isFetching: isFetchingQuote } = useStockQuote(normalizedTicker);

  // Live market status for the ticker
  const marketStatus = useMemo(() => {
    return calculateMarketStatus(normalizedTicker || "RELIANCE.NS");
  }, [normalizedTicker]);

  // Lock body scroll & handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isExecuting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isExecuting, onClose]);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (!isOpen) return;
    const activeTicker = (initialTicker || "RELIANCE.NS").toUpperCase().trim();
    const activeAction = initialAction || "BUY";
    setTicker(activeTicker);
    setAction(activeAction);

    const holding = findHoldingByTicker(holdings, activeTicker);

    if (initialPrice !== null && initialPrice !== undefined && Number(initialPrice) > 0) {
      setPrice(Number(initialPrice).toFixed(2));
    } else if (holding?.current_price && Number(holding.current_price) > 0) {
      setPrice(Number(holding.current_price).toFixed(2));
    } else if (holding?.average_price && Number(holding.average_price) > 0) {
      setPrice(Number(holding.average_price).toFixed(2));
    }

    if (initialShares !== null && initialShares !== undefined && Number(initialShares) > 0) {
      setShares(String(initialShares));
    } else if (activeAction === "SELL" && holding?.shares) {
      setShares(String(holding.shares));
    } else {
      setShares("10");
    }

    setLocalError("");
    setIsPriceManuallyEdited(false);
  }, [isOpen, initialTicker, initialAction, initialPrice, initialShares, holdings]);

  // Derive real-time market price converted to active display currency
  const liveMarketPrice = useMemo(() => {
    if (quote?.current_price && quote.current_price > 0) {
      const nativeCurr = getStockNativeCurrency(normalizedTicker, quote.currency);
      const converted = convertCurrency(quote.current_price, nativeCurr, portfolioCurrency || "INR");
      return Number(converted).toFixed(2);
    }
    return null;
  }, [quote?.current_price, quote?.currency, normalizedTicker, portfolioCurrency]);

  // Default execution price to live market price as soon as quote arrives, unless user manually edited it
  useEffect(() => {
    if (liveMarketPrice && !isPriceManuallyEdited) {
      setPrice(liveMarketPrice);
    }
  }, [liveMarketPrice, isPriceManuallyEdited]);

  if (!isOpen) return null;

  const currentHolding = findHoldingByTicker(holdings, normalizedTicker);
  const ownedShares = currentHolding ? Number(currentHolding.shares) || 0 : 0;

  const sharesNum = Number(shares) || 0;
  const priceNum = Number(price) || 0;
  const totalValue = sharesNum * priceNum;

  const maxAffordableBuy = priceNum > 0 ? Math.floor(cashBalance / priceNum) : 0;
  const maxSelectableShares = action === "BUY" ? maxAffordableBuy : ownedShares;

  const isInsufficientCash = action === "BUY" && totalValue > cashBalance;
  const isOverOwnedShares = action === "SELL" && sharesNum > ownedShares;
  const isZeroOwnedShares = action === "SELL" && ownedShares <= 0;
  const isInvalidAmount = isNaN(sharesNum) || sharesNum <= 0;

  const getPercentageShares = (pct) => {
    if (pct === 100) return maxSelectableShares;
    if (action === "BUY") {
      if (maxAffordableBuy <= 0) return 0;
      return Math.max(Math.floor(maxAffordableBuy * (pct / 100)), 1);
    }
    if (ownedShares <= 0) return 0;
    const raw = ownedShares * (pct / 100);
    return Number.isInteger(ownedShares)
      ? Math.max(1, Math.floor(raw))
      : Math.round(raw * 100) / 100;
  };

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
        setLocalError(`You do not own any shares of ${normalizedTicker} in this portfolio.`);
        setShares("0");
        return;
      }
      setShares(String(ownedShares));
    }
  };

  const handleSetPercentage = (pct) => {
    setLocalError("");
    if (pct === 100) {
      handleSetMax();
      return;
    }
    setShares(String(getPercentageShares(pct)));
  };

  const handleSnapToMarketPrice = () => {
    if (!liveMarketPrice) return;
    setPrice(liveMarketPrice);
    setIsPriceManuallyEdited(false);
    setLocalError("");
  };

  const handleActionChange = (newAction) => {
    setAction(newAction);
    setLocalError("");
    const holding = findHoldingByTicker(holdings, normalizedTicker);
    if (newAction === "SELL") {
      setShares(holding?.shares ? String(holding.shares) : "0");
      if (holding?.current_price) {
        setPrice(Number(holding.current_price).toFixed(2));
      }
    } else if (shares === "0" || Number(shares) > maxAffordableBuy) {
      setShares(String(Math.min(10, Math.max(1, maxAffordableBuy))));
    }
  };

  const handleSelectTicker = (selectedTicker) => {
    const sym = selectedTicker.toUpperCase().trim();
    setTicker(sym);
    setIsPriceManuallyEdited(false);
    setLocalError("");
    const holding = findHoldingByTicker(holdings, sym);
    if (holding?.current_price) {
      setPrice(Number(holding.current_price).toFixed(2));
    }
    if (action === "SELL") {
      setShares(holding ? String(holding.shares) : "0");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!normalizedTicker) {
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
        setLocalError(`You do not own any shares of ${normalizedTicker} in this portfolio to sell.`);
        return;
      }
      if (sharesNum > ownedShares) {
        setLocalError(
          `Cannot sell ${sharesNum} shares: You only own ${ownedShares} shares of ${normalizedTicker}.`
        );
        return;
      }
    }

    try {
      await onExecute({
        portfolioId,
        ticker: normalizedTicker,
        action,
        shares: sharesNum,
        price: priceNum,
      });
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  const sessionLabel = formatSessionLabel(marketStatus.session);
  const priceStatusBadge = isPriceManuallyEdited
    ? {
        dot: "bg-brand-cyan",
        text: "text-brand-cyan",
        label: "Custom",
      }
    : !marketStatus.isOpen
    ? {
        dot: "bg-amber-400",
        text: "text-amber-600 dark:text-amber-300",
        label: "Last Close",
      }
    : {
        dot: "bg-brand-emerald animate-pulse",
        text: "text-brand-emerald",
        label: "Live",
      };

  const modalContent = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/45 dark:bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2.5rem)] flex flex-col bg-brand-surface/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-brand-border overflow-hidden animate-scale-in will-change-transform">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-brand-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="tx-modal-title" className="text-base font-bold text-brand-textPrimary tracking-tight">
                Execute Simulated Order
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                  action === "SELL"
                    ? "bg-red-500/15 text-brand-red border-red-500/30"
                    : "bg-emerald-500/15 text-brand-emerald border-brand-emerald/30"
                }`}
              >
                {action}
              </span>
            </div>
            <p className="text-[11px] text-brand-textMuted mt-0.5">
              Instant paper execution • 0% simulated commission
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order modal"
            className="p-1.5 rounded-xl text-brand-textMuted hover:text-brand-textPrimary hover:bg-brand-card transition-colors duration-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Account Context Strip */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-brand-card/70 border border-brand-border">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-brand-textSecondary">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shrink-0" />
                <span className="truncate">Available Cash</span>
              </div>
              <p className="font-mono font-bold text-sm text-brand-emerald tabular-nums mt-0.5 truncate">
                {formatPortfolio(cashBalance)}
              </p>
            </div>

            <div className="min-w-0 border-l border-brand-border pl-3">
              <div className="text-[11px] text-brand-textSecondary truncate">
                {action === "SELL" ? `Position (${normalizedTicker || "Stock"})` : "Max Buying Power"}
              </div>
              <p className="font-mono font-bold text-sm text-brand-textPrimary tabular-nums mt-0.5 truncate">
                {action === "SELL"
                  ? `${ownedShares} ${ownedShares === 1 ? "share" : "shares"}`
                  : `${maxAffordableBuy} ${maxAffordableBuy === 1 ? "share" : "shares"}`}
              </p>
            </div>
          </div>

          {/* API / Submission Error */}
          {(localError || error) && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-red-500 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Action Switcher: BUY vs SELL */}
          <div className="grid grid-cols-2 gap-1.5 bg-brand-card/80 p-1 rounded-2xl border border-brand-border">
            <button
              type="button"
              onClick={() => handleActionChange("BUY")}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 ease-out cursor-pointer ${
                action === "BUY"
                  ? "bg-brand-emerald text-white dark:text-brand-bg shadow-sm"
                  : "text-brand-textMuted hover:text-brand-textPrimary"
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>BUY (Long)</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionChange("SELL")}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-300 ease-out cursor-pointer ${
                action === "SELL"
                  ? "bg-brand-red text-white shadow-sm"
                  : "text-brand-textMuted hover:text-brand-textPrimary"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>SELL (Exit)</span>
            </button>
          </div>

          {/* Stock Ticker + Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="tx-ticker-input"
                className="text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider"
              >
                Stock Ticker
              </label>
              <span className="text-[10px] text-brand-textMuted font-mono">
                {marketStatus.exchange} Exchange
              </span>
            </div>

            <div className="flex items-center bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2 focus-within:border-brand-emerald focus-within:ring-2 focus-within:ring-brand-emerald/15 transition-all duration-300">
              <input
                id="tx-ticker-input"
                type="text"
                required
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value.toUpperCase());
                  setIsPriceManuallyEdited(false);
                  setLocalError("");
                }}
                placeholder="AAPL"
                className="min-w-0 flex-1 bg-transparent text-sm text-brand-textPrimary font-mono font-semibold uppercase focus:outline-none"
              />
              {isFetchingQuote ? (
                <Loader2 className="w-3.5 h-3.5 text-brand-emerald animate-spin shrink-0 ml-2" />
              ) : quote?.company_name ? (
                <span className="text-[11px] text-brand-textMuted truncate max-w-[180px] ml-2">
                  {quote.company_name}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {action === "SELL" && holdings && holdings.length > 0
                ? holdings.map((h) => {
                    const isSelected = normalizedTicker === h.ticker?.toUpperCase();
                    return (
                      <button
                        type="button"
                        key={h.ticker}
                        onClick={() => handleSelectTicker(h.ticker)}
                        className={`px-2.5 py-1 text-[11px] rounded-xl border transition-all duration-300 cursor-pointer font-mono ${
                          isSelected
                            ? "bg-red-500/15 border-brand-red text-brand-red font-bold shadow-sm"
                            : "bg-brand-surface border-brand-border text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-borderHover"
                        }`}
                      >
                        {h.ticker} <span className="text-[10px] opacity-75">({h.shares})</span>
                      </button>
                    );
                  })
                : DEFAULT_TICKERS.map((t) => {
                    const isSelected = normalizedTicker === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => handleSelectTicker(t)}
                        className={`px-2.5 py-1 text-[11px] rounded-xl border transition-all duration-300 cursor-pointer font-mono ${
                          isSelected
                            ? "bg-brand-emerald/15 border-brand-emerald text-brand-emerald font-bold"
                            : "bg-brand-surface border-brand-border text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-borderHover"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Shares & Execution Price Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Shares Count */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="tx-shares-input"
                  className="text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider"
                >
                  Shares Count
                </label>
                {action === "SELL" && (
                  <span className="text-[10px] text-brand-textMuted font-mono whitespace-nowrap">
                    Owned: {ownedShares}
                  </span>
                )}
              </div>

              <div
                className={`flex items-center bg-brand-surface border rounded-xl px-3.5 py-2 transition-all duration-300 ${
                  isOverOwnedShares || isInsufficientCash
                    ? "border-red-500/80 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/15"
                    : "border-brand-border focus-within:border-brand-emerald focus-within:ring-2 focus-within:ring-brand-emerald/15"
                }`}
              >
                <input
                  id="tx-shares-input"
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
                  className="min-w-0 flex-1 bg-transparent text-sm text-brand-textPrimary font-mono font-bold tabular-nums focus:outline-none"
                />
                <span className="text-[11px] text-brand-textMuted font-mono ml-2 select-none">
                  shares
                </span>
              </div>
            </div>

            {/* Execution Price */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="tx-price-input"
                  className="text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider whitespace-nowrap"
                >
                  Execution Price ({symbol})
                </label>
                <span
                  className={`text-[10px] font-semibold flex items-center gap-1 font-mono whitespace-nowrap ${priceStatusBadge.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${priceStatusBadge.dot}`} />
                  {priceStatusBadge.label}
                </span>
              </div>

              <div className="flex items-center bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2 focus-within:border-brand-emerald focus-within:ring-2 focus-within:ring-brand-emerald/15 transition-all duration-300">
                <span className="text-brand-textMuted font-mono font-bold text-sm mr-1.5 select-none">
                  {symbol}
                </span>
                <input
                  id="tx-price-input"
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
                  className="min-w-0 flex-1 bg-transparent text-sm text-brand-textPrimary font-mono font-bold tabular-nums focus:outline-none"
                />
                {liveMarketPrice && isPriceManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleSnapToMarketPrice}
                    title={`Reset to ${marketStatus.isOpen ? "live quote" : "official close"} (${symbol}${liveMarketPrice})`}
                    className="ml-2 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-brand-card hover:bg-brand-cardHover text-brand-textSecondary hover:text-brand-textPrimary border border-brand-border transition-colors duration-200 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{marketStatus.isOpen ? "Live" : "Close"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Allocation Fill Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-brand-card/60 border border-brand-border text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-brand-textSecondary">
              <Sparkles className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
              <span className="font-medium">Quick Fill</span>
            </div>
            <div className="flex items-center gap-1.5">
              {QUICK_FILL_OPTIONS.map((item) => {
                const targetQty = getPercentageShares(item.pct);
                const isSelected = maxSelectableShares > 0 && Number(shares) === targetQty;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSetPercentage(item.pct)}
                    disabled={maxSelectableShares <= 0}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 cursor-pointer font-mono ${
                      isSelected
                        ? action === "BUY"
                          ? "bg-brand-emerald text-white dark:text-brand-bg font-black shadow-sm"
                          : "bg-brand-red text-white font-black shadow-sm"
                        : "bg-brand-surface border border-brand-border text-brand-textSecondary hover:text-brand-textPrimary hover:border-brand-borderHover"
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                    title={`Fill ${item.label} (${targetQty} shares)`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Single Concise Market / Custom Price Notice */}
          {isPriceManuallyEdited ? (
            <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-700 dark:text-cyan-300 flex items-center justify-between gap-2">
              <span>Custom price active — paper trade will execute at your entered rate.</span>
              {liveMarketPrice && (
                <button
                  type="button"
                  onClick={handleSnapToMarketPrice}
                  className="font-mono font-bold text-brand-emerald hover:underline shrink-0 cursor-pointer"
                >
                  Use {symbol}
                  {Number(liveMarketPrice).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </button>
              )}
            </div>
          ) : !marketStatus.isOpen ? (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-200 flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Market closed ({sessionLabel}) — paper trade fills at the last official close.
              </span>
            </div>
          ) : null}

          {/* Inline Validation Warnings */}
          {isInsufficientCash && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Order exceeds cash balance by {formatPortfolio(totalValue - cashBalance)}
              </span>
            </div>
          )}

          {isOverOwnedShares && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Cannot sell {sharesNum} shares: You only own {ownedShares} shares.
              </span>
            </div>
          )}

          {isZeroOwnedShares && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>You have 0 shares of {normalizedTicker} in this portfolio to exit.</span>
            </div>
          )}

          {/* Estimated Order Summary */}
          <div className="p-3.5 rounded-2xl bg-brand-card/60 border border-brand-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-brand-textSecondary font-medium">Estimated Order Total</span>
              <span className="text-base font-bold text-brand-textPrimary font-mono tabular-nums">
                {formatPortfolio(totalValue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-brand-textMuted font-mono pt-1.5 border-t border-brand-border">
              <span>{action === "BUY" ? "Remaining Cash" : "Proceeds to Cash"}</span>
              <span
                className={
                  action === "BUY" && isInsufficientCash
                    ? "text-red-500 dark:text-red-400 font-bold tabular-nums"
                    : "text-brand-textSecondary font-semibold tabular-nums"
                }
              >
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
            className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ease-out ${
              action === "BUY"
                ? "btn-primary"
                : "bg-brand-red text-white hover:bg-red-600 shadow-md hover:shadow-red-500/20"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>
                Confirm {action} Order {!marketStatus.isOpen ? "(Paper Trade)" : ""}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
