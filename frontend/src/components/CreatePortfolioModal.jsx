import React, { useState } from "react";
import { X, Briefcase, DollarSign, Loader2 } from "lucide-react";

/**
 * Create Portfolio Modal — Name + Initial Cash.
 */
export const CreatePortfolioModal = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [name, setName] = useState("");
  const [cash, setCash] = useState("100000");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !cash) return;
    setError(null);
    try {
      await onCreate({ name: name.trim(), initial_cash: Number(cash) });
      setName("");
      setCash("100000");
      setError(null);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to create portfolio. Please verify authentication.";
      setError(msg);
    }
  };

  const presets = [
    { label: "₹50K", value: "50000" },
    { label: "₹1L", value: "100000" },
    { label: "₹5L", value: "500000" },
    { label: "₹10L", value: "1000000" },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-brand-emerald" />
            </div>
            <div>
              <h2 className="text-base font-black text-brand-textPrimary">New Portfolio</h2>
              <p className="text-xs text-brand-textMuted">Allocate virtual capital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-brand-card text-brand-textMuted hover:text-brand-textPrimary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-brand-red font-medium">
              {error}
            </div>
          )}
          {/* Portfolio Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
              Portfolio Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth Portfolio"
              className="input-field"
              required
              autoFocus
            />
          </div>

          {/* Initial Cash */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Starting Capital (₹)
            </label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              min="1000"
              step="1000"
              className="input-field font-mono text-lg font-bold"
              required
            />
            <div className="flex gap-2 pt-1">
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCash(p.value)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cash === p.value
                      ? "bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/30"
                      : "bg-brand-card border border-brand-border text-brand-textMuted hover:text-brand-textPrimary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isCreating || !name.trim()}
            className="w-full btn-primary py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Portfolio</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
