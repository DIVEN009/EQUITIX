import React, { useState } from "react";
import {
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Sparkles,
  Trash2,
  RefreshCw,
  Loader2,
  ChevronDown,
  Layers,
} from "lucide-react";
import { usePortfolios, usePortfolioDetail } from "../hooks/usePortfolios";
import { TransactionModal } from "../components/TransactionModal";
import { CreatePortfolioModal } from "../components/CreatePortfolioModal";

export const DashboardPage = () => {
  const { portfolios, isLoadingPortfolios, createPortfolio, isCreatingPortfolio, deletePortfolio, isDeletingPortfolio } =
    usePortfolios();

  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [txInitialTicker, setTxInitialTicker] = useState("AAPL");
  const [txInitialAction, setTxInitialAction] = useState("BUY");

  // Derive active portfolio ID cleanly without effect cascading render
  const activePortfolioId = selectedPortfolioId || (portfolios.length > 0 ? portfolios[0].id : null);

  const { portfolio, isLoading: isLoadingDetail, executeTransaction, isExecutingTx, txError, refetch } =
    usePortfolioDetail(activePortfolioId);

  const handleOpenTx = (ticker = "AAPL", action = "BUY") => {
    setTxInitialTicker(ticker);
    setTxInitialAction(action);
    setIsTxModalOpen(true);
  };

  const handleDeleteActivePortfolio = async () => {
    if (!activePortfolioId) return;
    if (window.confirm("Are you sure you want to delete this portfolio? This cannot be undone.")) {
      await deletePortfolio(activePortfolioId);
      setSelectedPortfolioId(null);
    }
  };

  if (isLoadingPortfolios) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-emerald animate-spin" />
        <span className="text-xs text-brand-textMuted tracking-wider uppercase font-semibold">
          Loading Portfolio Dashboard...
        </span>
      </div>
    );
  }

  // Empty state: No portfolios exist yet
  if (!portfolios || portfolios.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-brand-emerald/30 flex items-center justify-center mx-auto text-brand-emerald shadow-emeraldGlow">
          <Briefcase className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create Your First Portfolio</h2>
          <p className="text-xs text-brand-textMuted mt-1 max-w-xs mx-auto">
            Allocate virtual paper cash to simulate quantitative holdings, test time-series predictions, and track alpha.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-emerald-glow px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Launch New Portfolio</span>
        </button>

        <CreatePortfolioModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={async (data) => {
            const newP = await createPortfolio(data);
            if (newP?.id) setSelectedPortfolioId(newP.id);
          }}
          isCreating={isCreatingPortfolio}
        />
      </div>
    );
  }

  // Calculate Asset Allocation percentages
  const totalVal = portfolio?.total_value || 0;
  const cashVal = portfolio?.cash_balance || 0;
  const holdingsVal = portfolio?.holdings_value || 0;

  const equitiesPct = totalVal > 0 ? Math.round((holdingsVal / totalVal) * 100) : 0;
  const cashPct = totalVal > 0 ? Math.round((cashVal / totalVal) * 100) : 100;

  const isPositivePnl = (portfolio?.total_unrealized_pnl || 0) >= 0;

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Portfolio Selector & Actions Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <select
            value={activePortfolioId || ""}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="w-full bg-brand-surface border border-white/10 hover:border-white/20 rounded-2xl px-4 py-2.5 text-xs font-bold text-white appearance-none cursor-pointer pr-10 focus:outline-none focus:border-brand-emerald"
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id} className="bg-brand-surface text-white">
                {p.name} (${Number(p.cash_balance).toLocaleString()})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-brand-textMuted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          title="Create New Portfolio"
          className="p-2.5 rounded-2xl bg-brand-surface border border-white/10 hover:border-brand-emerald text-brand-textSecondary hover:text-brand-emerald transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={handleDeleteActivePortfolio}
          disabled={isDeletingPortfolio}
          title="Delete Active Portfolio"
          className="p-2.5 rounded-2xl bg-brand-surface border border-white/10 hover:border-red-500/50 text-brand-textMuted hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Live Valuation Card matching mockup */}
      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-cardGlass">
        <div className="flex items-center justify-between text-xs text-brand-textMuted mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Live Portfolio Valuation</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingDetail ? "animate-spin" : ""}`} />
            <span>99.6% AI Sync</span>
          </button>
        </div>

        {/* Large Total Value Display */}
        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 font-mono">
          ${totalVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {/* P&L Metrics row */}
        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs font-semibold">
          <div
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
              isPositivePnl ? "bg-emerald-500/10 text-brand-emerald" : "bg-red-500/10 text-brand-red"
            }`}
          >
            {isPositivePnl ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {isPositivePnl ? "+" : ""}
              ${(portfolio?.total_unrealized_pnl || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} (
              {portfolio?.total_unrealized_pnl_percent || 0}%)
            </span>
          </div>
          <span className="text-brand-textMuted text-[11px]">Unrealized P&L</span>

          <span className="text-[11px] text-brand-textSecondary ml-auto font-mono">
            Cash: ${cashVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Asset Allocation Bar */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex justify-between text-[10px] text-brand-textSecondary mb-2 font-medium">
            <span>Allocation Distribution</span>
            <span className="text-brand-emerald font-semibold">Deep Learning Net: High</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full flex overflow-hidden">
            <div
              style={{ width: `${equitiesPct}%` }}
              className="bg-brand-emerald transition-all duration-500"
              title={`Equities ${equitiesPct}%`}
            />
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-white/40 transition-all duration-500"
              title={`Cash ${cashPct}%`}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-brand-textMuted font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
              Equities {equitiesPct}% (${holdingsVal.toLocaleString("en-US", { minimumFractionDigits: 0 })})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              Cash {cashPct}% (${cashVal.toLocaleString("en-US", { minimumFractionDigits: 0 })})
            </span>
          </div>
        </div>

        {/* Action Button: Add Transaction */}
        <button
          onClick={() => handleOpenTx("AAPL", "BUY")}
          className="w-full btn-emerald-glow mt-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-emeraldGlow"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Predictive Rebalancing AI Card matching mockup */}
      <div className="glass-panel rounded-2xl p-4 border border-brand-emerald/30 bg-emerald-500/5 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>Predictive Rebalancing</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-brand-emerald/20 text-brand-emerald rounded-full">Active</span>
          </h4>
          <p className="text-[11px] text-brand-textSecondary mt-0.5 leading-relaxed">
            Equitix AI neural models suggest optimizing portfolio variance by maintaining balanced exposure across large-cap tech. LSTM forecasts upside momentum across target holdings.
          </p>
        </div>
      </div>

      {/* Active Holdings List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Active Holdings</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-brand-textSecondary font-mono">
              {portfolio?.holdings?.length || 0} Assets
            </span>
          </h3>
          <span className="text-[11px] text-brand-textMuted font-mono">Live Pricing</span>
        </div>

        {!portfolio?.holdings || portfolio.holdings.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center space-y-3 border border-dashed border-white/10">
            <Layers className="w-8 h-8 text-brand-textMuted mx-auto opacity-50" />
            <div className="text-xs text-brand-textSecondary font-semibold">No stock holdings in this portfolio yet</div>
            <p className="text-[11px] text-brand-textMuted max-w-xs mx-auto">
              Click &quot;Add Transaction&quot; above to buy your first stock allocation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {portfolio.holdings.map((h) => {
              const isGain = h.unrealized_pnl >= 0;
              return (
                <div
                  key={h.id}
                  className="glass-panel glass-panel-hover rounded-2xl p-4 flex items-center justify-between border border-white/5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white tracking-wide">{h.ticker}</span>
                      <span className="text-[11px] text-brand-textMuted max-w-[120px] truncate">{h.company_name}</span>
                    </div>
                    <div className="text-[11px] text-brand-textSecondary mt-1 font-mono">
                      {h.shares} Shares <span className="text-brand-textMuted">• Avg ${h.average_price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-white font-mono">
                      ${h.current_value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      className={`text-[11px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                        isGain ? "text-brand-emerald" : "text-brand-red"
                      }`}
                    >
                      {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>
                        {isGain ? "+" : ""}
                        ${h.unrealized_pnl.toFixed(2)} ({h.unrealized_pnl_percent.toFixed(2)}%)
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex justify-end gap-1.5 mt-1.5">
                      <button
                        onClick={() => handleOpenTx(h.ticker, "BUY")}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-brand-emerald text-[10px] font-bold transition-colors"
                      >
                        Buy More
                      </button>
                      <button
                        onClick={() => handleOpenTx(h.ticker, "SELL")}
                        className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-colors"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        portfolioId={activePortfolioId}
        cashBalance={portfolio?.cash_balance || 0}
        initialTicker={txInitialTicker}
        initialAction={txInitialAction}
        onExecute={executeTransaction}
        isExecuting={isExecutingTx}
        error={txError}
      />

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (data) => {
          const newP = await createPortfolio(data);
          if (newP?.id) setActivePortfolioId(newP.id);
        }}
        isCreating={isCreatingPortfolio}
      />
    </div>
  );
};
