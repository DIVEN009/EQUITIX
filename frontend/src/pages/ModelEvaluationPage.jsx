import React, { useState } from "react";
import { Cpu, LineChart, Sparkles } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export const ModelEvaluationPage = () => {
  const { selectedTicker } = useAuthStore();
  const [activeModel, setActiveModel] = useState("lstm"); // "lstm" | "linear"

  return (
    <div className="max-w-md md:max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Header Card */}
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between text-xs text-brand-textMuted mb-1">
          <div className="flex items-center gap-1.5 text-brand-emerald">
            <Cpu className="w-4 h-4" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">{selectedTicker} Inference Engine</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 text-[10px] font-bold">
            Live Inference
          </span>
        </div>

        <h2 className="text-xl font-extrabold text-white mt-2">Predictive Intelligence</h2>
        <p className="text-xs text-brand-textSecondary mt-0.5">
          Comparing multi-factor neural networks on {selectedTicker} future price action.
        </p>

        {/* Model switcher pills */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          <button
            onClick={() => setActiveModel("lstm")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              activeModel === "lstm"
                ? "bg-emerald-500/10 border-brand-emerald text-white shadow-emeraldGlow"
                : "bg-brand-surface border-white/5 text-brand-textMuted hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">TensorFlow LSTM</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-brand-emerald/20 text-brand-emerald font-bold">
                Recommended
              </span>
            </div>
            <div className="text-[10px] text-brand-textSecondary mt-1">Deep Recurrent Network</div>
          </button>

          <button
            onClick={() => setActiveModel("linear")}
            className={`p-3 rounded-2xl border text-left transition-all ${
              activeModel === "linear"
                ? "bg-cyan-500/10 border-brand-cyan text-white shadow-sm"
                : "bg-brand-surface border-white/5 text-brand-textMuted hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">Linear Regr.</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-brand-textMuted font-bold">
                Baseline
              </span>
            </div>
            <div className="text-[10px] text-brand-textSecondary mt-1">OLS Statistical Trend</div>
          </button>
        </div>

        {/* Target Asset header */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-xs">
          <div>
            <div className="text-[10px] text-brand-textMuted uppercase font-semibold">Target Asset</div>
            <div className="text-base font-bold text-white mt-0.5">{selectedTicker} $189.45 <span className="text-brand-emerald text-xs">+2.15%</span></div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-brand-textMuted uppercase font-semibold">Forecast Horizon</div>
            <div className="text-base font-bold text-brand-cyan mt-0.5">T + 7 Days</div>
          </div>
        </div>

        {/* Forecast curve chart placeholder */}
        <div className="h-44 bg-brand-surface/40 rounded-2xl mt-4 border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-2">
          <LineChart className="w-8 h-8 text-brand-cyan/40 animate-pulse" />
          <span>7-Day Predictive Horizon Plot (Ready for Day 11 integration)</span>
        </div>
      </div>

      {/* Validation Benchmarks section matching mockup */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Validation Benchmarks</h3>
          <span className="text-[10px] text-brand-textMuted font-mono">Test Window: 180 Days</span>
        </div>

        <div className="space-y-3">
          {/* LSTM card */}
          <div className="glass-panel rounded-2xl p-4 border border-brand-emerald/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">TensorFlow LSTM</span>
                <span className="text-[10px] text-brand-textSecondary block">Deep Recurrent Network</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand-emerald text-brand-bg font-extrabold text-[10px]">
                RECOMMENDED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/10">
              <div>
                <div className="text-[10px] text-brand-textMuted uppercase font-medium">Root Mean Sq. Error</div>
                <div className="text-xl font-black text-white mt-0.5">$1.24 <span className="text-[10px] font-normal text-brand-textMuted">RMSE</span></div>
                <span className="text-[10px] text-brand-emerald font-semibold">Minimal variance under high volatility</span>
              </div>
              <div>
                <div className="text-[10px] text-brand-textMuted uppercase font-medium">Directional Accuracy</div>
                <div className="text-xl font-black text-brand-emerald mt-0.5">84.6%</div>
                <span className="text-[10px] text-brand-emerald font-semibold">High classification success</span>
              </div>
            </div>
          </div>

          {/* Baseline card */}
          <div className="glass-panel rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white">Linear Regression</span>
                <span className="text-[10px] text-brand-textSecondary block">OLS Statistical Baseline</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-brand-textMuted font-bold text-[10px]">
                BASELINE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/10">
              <div>
                <div className="text-[10px] text-brand-textMuted uppercase font-medium">Root Mean Sq. Error</div>
                <div className="text-xl font-black text-white mt-0.5">$3.89 <span className="text-[10px] font-normal text-brand-textMuted">RMSE</span></div>
                <span className="text-[10px] text-brand-red font-semibold">Prone to underfitting non-linear runs</span>
              </div>
              <div>
                <div className="text-[10px] text-brand-textMuted uppercase font-medium">Directional Accuracy</div>
                <div className="text-xl font-black text-brand-textSecondary mt-0.5">61.2%</div>
                <span className="text-[10px] text-brand-textMuted font-semibold">Marginal alpha capture</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Neural divergence callout */}
      <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-cyan-500/5 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-white">Neural Divergence Detected</h4>
          <p className="text-[11px] text-brand-textSecondary mt-0.5 leading-relaxed">
            TensorFlow LSTM detects non-linear momentum clusters across {selectedTicker} volume-weighted indicators, projecting an upside breakout above $194.50 within 4 trading sessions. Linear Regression fails to capture cross-asset volatility spillover.
          </p>
        </div>
      </div>
    </div>
  );
};
