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
  TrendingUp,
  ArrowRight,
  Wallet,
  PieChart,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { usePortfolios, usePortfolioDetail } from "../hooks/usePortfolios";
import { TransactionModal } from "../components/TransactionModal";
import { CreatePortfolioModal } from "../components/CreatePortfolioModal";
import { toast } from "../store/toastStore";
import { useCurrency } from "../utils/currency";

export const DashboardPage = () => {
  const { setActiveTab } = useAuthStore();
  const { formatPortfolio, formatStock, format: formatRupee } = useCurrency();
  const { portfolios, isLoadingPortfolios, createPortfolio, isCreatingPortfolio, deletePortfolio, isDeletingPortfolio } =
    usePortfolios();

  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [txInitialTicker, setTxInitialTicker] = useState("AAPL");
  const [txInitialAction, setTxInitialAction] = useState("BUY");
  const [txInitialPrice, setTxInitialPrice] = useState(null);
  const [txInitialShares, setTxInitialShares] = useState(null);

  // Derive active portfolio ID cleanly without effect cascading render
  const activePortfolioId = selectedPortfolioId || (portfolios.length > 0 ? portfolios[0].id : null);

  const { portfolio, isLoading: isLoadingDetail, executeTransaction, isExecutingTx, txError, refetch } =
    usePortfolioDetail(activePortfolioId);

  const handleOpenTx = (ticker = "AAPL", action = "BUY", price = null, shares = null) => {
    setTxInitialTicker(ticker);
    setTxInitialAction(action);
    setTxInitialPrice(price);
    setTxInitialShares(shares);
    setIsTxModalOpen(true);
  };

  const handleDeleteActivePortfolio = async () => {
    if (!activePortfolioId) return;
    if (window.confirm("Are you sure you want to delete this portfolio? This cannot be undone.")) {
      await deletePortfolio(activePortfolioId);
      setSelectedPortfolioId(null);
      toast.info("Portfolio Removed", "Portfolio and associated holdings were removed.");
    }
  };

  const handleExecuteTx = async (txData) => {
    await executeTransaction(txData);
    toast.success(
      "Order Executed",
      `${txData.action} ${txData.shares} ${txData.ticker} executed at ${formatStock(txData.price, txData.ticker)}.`
    );
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
            Allocate virtual paper cash in Rupees (₹) to simulate quantitative holdings, test time-series predictions, and track alpha.
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
            if (newP?.id) {
              setSelectedPortfolioId(newP.id);
              toast.success("Portfolio Initialized", `Created "${newP.name}" with ${formatPortfolio(newP.cash_balance, "INR", 0)} capital.`);
            }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8 space-y-6">
      {/* Portfolio Command Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-emerald" />
            <span>Portfolio Command Center</span>
          </h1>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Real-time equity valuation, dynamic currency tracking, and paper trade execution.
          </p>
        </div>

        {/* Portfolio Selector & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <select
              value={activePortfolioId || ""}
              onChange={(e) => setSelectedPortfolioId(e.target.value)}
              className="w-full bg-brand-surface border border-white/10 hover:border-white/20 rounded-2xl px-4 py-2 text-xs font-bold text-white appearance-none cursor-pointer pr-10 focus:outline-none focus:border-brand-emerald"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id} className="bg-brand-surface text-white">
                  {p.name} ({formatPortfolio(p.cash_balance, "INR", 0)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-brand-textMuted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            title="Create New Portfolio"
            className="p-2.5 rounded-2xl bg-brand-surface border border-white/10 hover:border-brand-emerald text-brand-textSecondary hover:text-brand-emerald transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={handleDeleteActivePortfolio}
            disabled={isDeletingPortfolio}
            title="Delete Active Portfolio"
            className="p-2.5 rounded-2xl bg-brand-surface border border-white/10 hover:border-red-500/50 text-brand-textMuted hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Valuation Hero Card + Holdings List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Live Valuation Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 relative overflow-hidden border border-white/10 shadow-cardGlass space-y-5">
            <div className="flex items-center justify-between text-xs text-brand-textMuted">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-ping" />
                <span className="font-bold uppercase tracking-wider text-[11px] text-white">
                  Live Portfolio Valuation
                </span>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetail ? "animate-spin" : ""}`} />
                <span>99.6% AI Sync</span>
              </button>
            </div>

            {/* Large Total Value Display & P&L */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pt-1">
              <div>
                <span className="text-[11px] text-brand-textMuted uppercase font-semibold tracking-wider">
                  Total Equity Capital
                </span>
                <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1 font-mono">
                  {formatPortfolio(totalVal)}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold ${
                    isPositivePnl ? "bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30" : "bg-red-500/10 text-brand-red border border-brand-red/30"
                  }`}
                >
                  {isPositivePnl ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>
                    {isPositivePnl ? "+" : ""}
                    {formatPortfolio(portfolio?.total_unrealized_pnl || 0)} (
                    {portfolio?.total_unrealized_pnl_percent || 0}%)
                  </span>
                </div>
                <span className="text-brand-textMuted text-[10px] font-medium">Unrealized Net P&L</span>
              </div>
            </div>

            {/* Quick Metrics 3-Col Bar */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
              <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Free Cash</span>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {formatPortfolio(cashVal)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Invested Assets</span>
                <div className="text-sm font-bold text-brand-emerald mt-0.5 font-mono">
                  {formatPortfolio(holdingsVal)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-brand-surface/60 border border-white/5">
                <span className="text-[10px] text-brand-textMuted uppercase font-semibold">Total Positions</span>
                <div className="text-sm font-bold text-white mt-0.5 font-mono">
                  {portfolio?.holdings?.length || 0} Stocks
                </div>
              </div>
            </div>

            {/* Asset Allocation Bar */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-brand-textSecondary font-medium">
                <span className="font-semibold text-white">Asset Allocation Distribution</span>
                <span className="text-brand-emerald font-bold">Risk Exposure: Balanced</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full flex overflow-hidden">
                <div
                  style={{ width: `${equitiesPct}%` }}
                  className="bg-brand-emerald transition-all duration-500 shadow-emeraldGlow"
                  title={`Equities ${equitiesPct}%`}
                />
                <div
                  style={{ width: `${cashPct}%` }}
                  className="bg-white/40 transition-all duration-500"
                  title={`Cash ${cashPct}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-brand-textMuted font-mono pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald" />
                  Equities: {equitiesPct}% ({formatPortfolio(holdingsVal, "INR", 0)})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/40" />
                  Cash: {cashPct}% ({formatPortfolio(cashVal, "INR", 0)})
                </span>
              </div>
            </div>

            {/* Action Buttons: Add Transaction & Discover Markets */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleOpenTx("AAPL", "BUY")}
                className="flex-1 btn-emerald-glow py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-emeraldGlow"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Transaction</span>
              </button>

              <button
                onClick={() => setActiveTab("market")}
                className="flex-1 py-3.5 rounded-2xl bg-brand-surface border border-white/10 hover:border-brand-emerald/40 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer hover:bg-brand-surface/80"
              >
                <TrendingUp className="w-4 h-4 text-brand-emerald" />
                <span>Discover Markets</span>
              </button>
            </div>
          </div>

          {/* Active Holdings Section */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Active Holdings</span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] text-brand-textSecondary font-mono font-bold">
                  {portfolio?.holdings?.length || 0} Assets
                </span>
              </h2>
              <span className="text-[11px] text-brand-textMuted font-mono">Live Normalized Quotes</span>
            </div>

            {!portfolio?.holdings || portfolio.holdings.length === 0 ? (
              <div className="rounded-2xl p-10 text-center space-y-4 border border-dashed border-white/10 bg-brand-surface/20">
                <Layers className="w-10 h-10 text-brand-textMuted mx-auto opacity-50" />
                <div className="space-y-1">
                  <div className="text-sm text-white font-bold">No active positions in this portfolio</div>
                  <p className="text-xs text-brand-textMuted max-w-sm mx-auto">
                    Click &quot;Add Transaction&quot; above to buy stock allocations or explore popular tickers in the Market tab.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("market")}
                  className="px-5 py-2.5 rounded-xl bg-brand-surface border border-brand-emerald/40 text-brand-emerald text-xs font-bold hover:bg-brand-emerald/10 transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Browse Stock Catalog</span>
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] text-brand-textMuted uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Asset</th>
                        <th className="pb-3 font-semibold">Shares</th>
                        <th className="pb-3 font-semibold">Avg Cost</th>
                        <th className="pb-3 font-semibold">Market Value</th>
                        <th className="pb-3 font-semibold">Unrealized P&L</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {portfolio.holdings.map((h) => {
                        const isGain = h.unrealized_pnl >= 0;
                        return (
                          <tr key={h.id} className="hover:bg-brand-surface/40 transition-colors">
                            <td className="py-3.5">
                              <div className="font-extrabold text-sm text-white font-mono">{h.ticker}</div>
                              <span className="text-[11px] text-brand-textMuted truncate block max-w-[160px]">
                                {h.company_name}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-slate-200 font-bold">{h.shares}</td>
                            <td className="py-3.5 font-mono text-brand-textSecondary">
                              {formatStock(h.average_price, h.ticker)}
                            </td>
                            <td className="py-3.5 font-mono font-bold text-white">
                              {formatStock(h.current_value, h.ticker)}
                            </td>
                            <td className="py-3.5">
                              <div
                                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  isGain ? "bg-emerald-500/10 text-brand-emerald" : "bg-red-500/10 text-brand-red"
                                }`}
                              >
                                {isGain ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                <span>
                                  {isGain ? "+" : ""}
                                  {formatStock(h.unrealized_pnl, h.ticker)} ({h.unrealized_pnl_percent.toFixed(2)}%)
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-right space-x-1.5">
                              <button
                                onClick={() => handleOpenTx(h.ticker, "BUY", h.current_price, 1)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-brand-emerald text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => handleOpenTx(h.ticker, "SELL", h.current_price, h.shares)}
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Sell
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-2.5">
                  {portfolio.holdings.map((h) => {
                    const isGain = h.unrealized_pnl >= 0;
                    return (
                      <div
                        key={h.id}
                        className="glass-panel glass-panel-hover rounded-2xl p-4 flex items-center justify-between border border-white/5"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white tracking-wide font-mono">{h.ticker}</span>
                            <span className="text-[11px] text-brand-textMuted max-w-[120px] truncate">{h.company_name}</span>
                          </div>
                          <div className="text-[11px] text-brand-textSecondary mt-1 font-mono">
                            {h.shares} Shares <span className="text-brand-textMuted">• Avg {formatStock(h.average_price, h.ticker)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-white font-mono">
                            {formatStock(h.current_value, h.ticker)}
                          </div>
                          <div
                            className={`text-[11px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                              isGain ? "text-brand-emerald" : "text-brand-red"
                            }`}
                          >
                            {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>
                              {isGain ? "+" : ""}
                              {formatStock(h.unrealized_pnl, h.ticker)} ({h.unrealized_pnl_percent.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="flex justify-end gap-1.5 mt-1.5">
                            <button
                              onClick={() => handleOpenTx(h.ticker, "BUY", h.current_price, 1)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-brand-emerald text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => handleOpenTx(h.ticker, "SELL", h.current_price, h.shares)}
                              className="px-2 py-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar Column (4 cols): Portfolio Switcher + AI Rebalancing + Allocation Stats */}
        <div className="lg:col-span-4 space-y-6">
          {/* Portfolios Management Card */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/10 shadow-cardGlass">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-textSecondary uppercase tracking-wider">
                My Portfolios ({portfolios.length})
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-[11px] font-bold text-brand-emerald hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Portfolio</span>
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {portfolios.map((p) => {
                const isActive = p.id === activePortfolioId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortfolioId(p.id)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-brand-card border-brand-emerald/40 text-white shadow-emeraldGlow"
                        : "bg-brand-surface/60 border-white/5 text-brand-textSecondary hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white">{p.name}</span>
                      {isActive && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-emerald text-brand-bg font-black">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                      <span className="text-brand-textMuted">Cash Reserves:</span>
                      <span className="font-bold text-brand-emerald">
                        {formatPortfolio(p.cash_balance, "INR", 0)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Predictive Rebalancing AI Card */}
          <div className="glass-panel rounded-3xl p-6 border border-brand-emerald/30 bg-emerald-500/5 space-y-3 shadow-cardGlass">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-brand-emerald shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Predictive Rebalancing</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-brand-emerald/20 text-brand-emerald rounded-full font-bold">
                    Active
                  </span>
                </h4>
                <span className="text-[10px] text-brand-textMuted">LSTM Multi-Factor Optimization</span>
              </div>
            </div>

            <p className="text-xs text-brand-textSecondary leading-relaxed pt-1">
              Equitix AI neural models suggest optimizing portfolio variance by maintaining balanced exposure across large-cap tech. Walk-forward forecasts indicate positive momentum across held assets.
            </p>

            <button
              onClick={() => setActiveTab("models")}
              className="w-full mt-2 py-2.5 rounded-xl bg-brand-surface border border-brand-emerald/30 hover:border-brand-emerald text-brand-emerald hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View AI Predictions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Portfolio Health & Alpha Summary */}
          <div className="glass-panel rounded-3xl p-6 space-y-3 border border-white/10 shadow-cardGlass text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-cyan" />
              <span>Capital Health & Risk Profile</span>
            </h4>

            <div className="space-y-2 pt-1 font-mono">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-brand-surface/50 border border-white/5">
                <span className="text-brand-textMuted text-[11px]">Gross Asset Leverage</span>
                <span className="font-bold text-white">1.00x (Cash Secured)</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-brand-surface/50 border border-white/5">
                <span className="text-brand-textMuted text-[11px]">Cash Liquidity Ratio</span>
                <span className="font-bold text-brand-emerald">{cashPct}%</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-brand-surface/50 border border-white/5">
                <span className="text-brand-textMuted text-[11px]">Execution Latency</span>
                <span className="font-bold text-brand-cyan">0ms (Live Paper)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        portfolioId={activePortfolioId}
        cashBalance={portfolio?.cash_balance || 0}
        holdings={portfolio?.holdings || []}
        initialTicker={txInitialTicker}
        initialAction={txInitialAction}
        initialPrice={txInitialPrice}
        initialShares={txInitialShares}
        onExecute={handleExecuteTx}
        isExecuting={isExecutingTx}
        error={txError}
      />

      {/* Create Portfolio Modal */}
      <CreatePortfolioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (data) => {
          const newP = await createPortfolio(data);
          if (newP?.id) {
            setSelectedPortfolioId(newP.id);
            toast.success("Portfolio Initialized", `Created "${newP.name}" with ${formatPortfolio(newP.cash_balance, "INR", 0)} capital.`);
          }
        }}
        isCreating={isCreatingPortfolio}
      />
    </div>
  );
};
