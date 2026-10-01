import React, { useState } from "react";
import { X, ArrowDownRight, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";

export const TransactionModal = ({
  isOpen,
  onClose,
  portfolioId,
  cashBalance = 0,
  initialTicker = "AAPL",
  initialAction = "BUY",
  onExecute,
  isExecuting,
  error,
}) => {
  const [ticker, setTicker] = useState(initialTicker);
  const [action, setAction] = useState(initialAction);
  const [shares, setShares] = useState("10");
  const [price, setPrice] = useState("190.00");
  const [localError, setLocalError] = useState("");

  if (!isOpen) return null;

  const totalValue = (Number(shares) || 0) * (Number(price) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!ticker.trim()) {
      setLocalError("Please enter a valid stock ticker symbol.");
      return;
    }

    const sharesNum = Number(shares);
    const priceNum = Number(price);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setLocalError("Shares count must be a positive number.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setLocalError("Execution price must be a positive dollar amount.");
      return;
    }

    if (action === "BUY" && totalValue > cashBalance) {
      setLocalError(`Insufficient funds: Portfolio cash is $${cashBalance.toFixed(2)}, transaction requires $${totalValue.toFixed(2)}`);
      return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-cardGlass relative border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white">Execute Simulated Order</h3>
            <p className="text-[11px] text-brand-textMuted">Instantly trade stocks with simulated paper cash</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Available Cash banner */}
        <div className="my-4 p-3 rounded-2xl bg-brand-surface border border-white/5 flex items-center justify-between text-xs">
          <span className="text-brand-textSecondary">Available Portfolio Cash</span>
          <span className="font-mono font-bold text-brand-emerald">${cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
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
              onClick={() => {
                setAction("BUY");
                setLocalError("");
              }}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
              onClick={() => {
                setAction("SELL");
                setLocalError("");
              }}
              className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
            <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1">
              Stock Ticker
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-brand-surface border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-brand-emerald"
              />
              {/* Quick ticker buttons */}
              {["AAPL", "NVDA", "TSLA"].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTicker(t)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-brand-surface border border-white/10 hover:border-brand-emerald/40 text-brand-textSecondary hover:text-white"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Shares and Price Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1">
                Shares Count
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                className="w-full bg-brand-surface border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-emerald"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1">
                Execution Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="190.00"
                className="w-full bg-brand-surface border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-emerald"
              />
            </div>
          </div>

          {/* Estimated Total Calculation */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-brand-textMuted font-medium">Estimated Order Total</span>
            <span className="text-base font-bold text-white font-mono">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isExecuting}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-4 cursor-pointer ${
              action === "BUY" ? "btn-emerald-glow" : "bg-brand-red text-white hover:bg-red-600 shadow-md"
            } disabled:opacity-50`}
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>Confirm {action} Order</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
