import React, { useState } from "react";
import { X, Briefcase, DollarSign, Loader2, AlertCircle } from "lucide-react";

export const CreatePortfolioModal = ({ isOpen, onClose, onCreate, isCreating }) => {
  const [name, setName] = useState("Alpha Quantitative Fund");
  const [initialCash, setInitialCash] = useState("50000");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide a name for your portfolio.");
      return;
    }

    const cashNum = Number(initialCash);
    if (isNaN(cashNum) || cashNum < 0) {
      setError("Initial cash must be zero or a positive amount.");
      return;
    }

    try {
      await onCreate({ name: name.trim(), initial_cash: cashNum });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to create portfolio.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-cardGlass relative border border-white/10">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Investment Portfolio</h3>
              <p className="text-[11px] text-brand-textMuted">Allocate virtual capital and track alpha</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-brand-textMuted hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1">
              Portfolio Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep Learning Alpha Fund"
              className="w-full bg-brand-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-emerald"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-brand-textSecondary uppercase tracking-wider mb-1">
              Initial Virtual Cash ($)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-brand-textMuted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="1000"
                min="0"
                required
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                placeholder="50000"
                className="w-full bg-brand-surface border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-brand-emerald"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {["10000", "50000", "100000", "250000"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setInitialCash(c)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-brand-surface border border-white/10 hover:border-brand-emerald/40 text-brand-textSecondary hover:text-white"
                >
                  ${Number(c).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full btn-emerald-glow py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin text-brand-bg" /> : <span>Create Portfolio</span>}
          </button>
        </form>
      </div>
    </div>
  );
};
