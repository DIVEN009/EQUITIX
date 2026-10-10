import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Activity,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useCurrency, getStockNativeCurrency } from "../utils/currency";

/**
 * Format date string into human friendly format
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Custom dark-glass tooltip for multi-curve forecast visualization
 */
const ForecastTooltip = ({ active, payload }) => {
  const { formatRaw } = useCurrency();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.type === "forecast";

    return (
      <div className="bg-brand-surface/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[210px] pointer-events-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="text-brand-textMuted text-[11px] font-medium">
            {formatDate(data.date)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isForecast
                ? "bg-cyan-500/10 text-brand-cyan border border-brand-cyan/20"
                : "bg-white/10 text-white border border-white/10"
            }`}
          >
            {isForecast ? "7D Forecast" : "Historical Actual"}
          </span>
        </div>

        {/* Historical Price */}
        {data.actual !== null && data.actual !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-brand-textSecondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Actual Close:
            </span>
            <span className="font-bold text-white text-xs">
              {formatRaw(data.actual)}
            </span>
          </div>
        )}

        {/* TensorFlow LSTM Forecast */}
        {data.lstm !== null && data.lstm !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-brand-emerald flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-emerald shadow-emeraldGlow" />
              Deep LSTM:
            </span>
            <span className="font-black text-brand-emerald text-xs">
              {formatRaw(data.lstm)}
            </span>
          </div>
        )}

        {/* Baseline Regression Forecast */}
        {data.baseline !== null && data.baseline !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-brand-cyan flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand-cyan" />
              Baseline Linear:
            </span>
            <span className="font-bold text-brand-cyan text-xs">
              {formatRaw(data.baseline)}
            </span>
          </div>
        )}

        {/* Divergence between models */}
        {isForecast && data.lstm && data.baseline && (
          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
            <span className="text-brand-textMuted">Model Divergence:</span>
            <span className="font-semibold text-white">
              {formatRaw(Math.abs(data.lstm - data.baseline))} (
              {((Math.abs(data.lstm - data.baseline) / data.baseline) * 100).toFixed(2)}%)
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ForecastChart = ({
  historyData = [],
  predictionsData = [],
  ticker = "",
  activeModel = "all", // "all" | "lstm" | "linear"
  isLoading = false,
  error = null,
  onRetry = null,
}) => {
  const { convert, symbol } = useCurrency();
  const nativeCurrency = getStockNativeCurrency(ticker);
  const conversionRate = convert(1, nativeCurrency);

  // Construct timeline joining historical points and 7-day predicted horizon
  const { chartData, minPrice, maxPrice, anchorDate, lstmTarget, driftPct } =
    useMemo(() => {
      // 1. Filter historyData to only strictly valid numeric closes and take last 8 trading days
      const validHistory = (historyData || []).filter(
        (h) => h && h.close != null && !isNaN(Number(h.close)) && Number(h.close) > 0
      );
      const recentHistory = validHistory.slice(-8);

      if (recentHistory.length === 0 && (!predictionsData || predictionsData.length === 0)) {
        return {
          chartData: [],
          minPrice: 0,
          maxPrice: 100,
          anchorDate: null,
          lstmTarget: null,
          baselineTarget: null,
          driftPct: 0,
        };
      }

      const lastHist = recentHistory.length > 0 ? recentHistory[recentHistory.length - 1] : null;
      const anchorPrice = lastHist ? Number(lastHist.close) : 0;
      const anchorDt = lastHist ? lastHist.date : null;

      // Group predictions by target_date
      const lstmMap = {};
      const baselineMap = {};

      (predictionsData || []).forEach((p) => {
        const dStr = p.target_date;
        const name = (p.model_name || "").toLowerCase();
        if (name.includes("lstm")) {
          lstmMap[dStr] = p.predicted_price;
        } else {
          baselineMap[dStr] = p.predicted_price;
        }
      });

      // Get unique sorted future target dates strictly after anchor date
      const futureDates = Array.from(
        new Set([...Object.keys(lstmMap), ...Object.keys(baselineMap)])
      )
        .filter((dStr) => !anchorDt || new Date(dStr) > new Date(anchorDt))
        .sort((a, b) => new Date(a) - new Date(b));

      // Construct points with currency conversion applied
      const points = [];

      // Historical points
      recentHistory.forEach((h, index) => {
        const isAnchor = index === recentHistory.length - 1;
        const cPrice =
          h.close != null && !isNaN(Number(h.close))
            ? Number((Number(h.close) * conversionRate).toFixed(2))
            : null;
        points.push({
          date: h.date,
          actual: cPrice,
          // Anchor point binds to both curves to avoid discontinuous rendering gap
          lstm: isAnchor ? cPrice : null,
          baseline: isAnchor ? cPrice : null,
          type: "history",
        });
      });

      // Forecast points
      futureDates.forEach((dStr) => {
        const rawLstm = lstmMap[dStr];
        const rawBase = baselineMap[dStr];
        points.push({
          date: dStr,
          actual: null,
          lstm: rawLstm != null && !isNaN(Number(rawLstm)) ? Number((Number(rawLstm) * conversionRate).toFixed(2)) : null,
          baseline: rawBase != null && !isNaN(Number(rawBase)) ? Number((Number(rawBase) * conversionRate).toFixed(2)) : null,
          type: "forecast",
        });
      });

      // Compute adaptive Y-Axis bounds
      const allPrices = points
        .flatMap((p) => [p.actual, p.lstm, p.baseline])
        .filter((v) => v !== null && !isNaN(v));

      const min = allPrices.length > 0 ? Math.min(...allPrices) : 100;
      const max = allPrices.length > 0 ? Math.max(...allPrices) : 200;
      const range = max - min;
      const padding = range > 0 ? range * 0.12 : (min * 0.05 || 1);

      const isLowPrice = max < 25;
      const minBound = isLowPrice
        ? Math.max(0, Number((min - padding).toFixed(2)))
        : Math.max(0, Math.floor(min - padding));
      const maxBound = isLowPrice
        ? Number((max + padding).toFixed(2))
        : Math.ceil(max + padding);

      const lastLstm = futureDates.length > 0 ? lstmMap[futureDates[futureDates.length - 1]] : null;
      const lastBase = futureDates.length > 0 ? baselineMap[futureDates[futureDates.length - 1]] : null;
      const convertedTarget = lastLstm != null ? Number((lastLstm * conversionRate).toFixed(2)) : null;
      const drift = anchorPrice && lastLstm ? ((lastLstm - anchorPrice) / anchorPrice) * 100 : 0;

      return {
        chartData: points,
        minPrice: minBound,
        maxPrice: maxBound,
        anchorDate: anchorDt,
        lstmTarget: convertedTarget,
        baselineTarget: lastBase != null ? Number((lastBase * conversionRate).toFixed(2)) : null,
        driftPct: drift,
      };
    }, [historyData, predictionsData, conversionRate]);


  if (isLoading) {
    return (
      <div className="h-60 bg-brand-surface/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-3">
        <RefreshCw className="w-8 h-8 text-brand-cyan animate-spin" />
        <span className="font-medium tracking-wide">
          Synthesizing multi-model neural forecasts...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-60 bg-brand-surface/40 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center text-xs p-6 text-center gap-3">
        <AlertCircle className="w-8 h-8 text-brand-red" />
        <p className="font-semibold text-white">Model Projections Unavailable</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 rounded-xl bg-brand-surface border border-white/10 hover:border-brand-emerald text-brand-emerald text-xs font-bold"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-60 bg-brand-surface/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-2">
        <Activity className="w-8 h-8 text-brand-textMuted/40" />
        <span>No forecast vectors loaded. Batch inference job scheduled at 00:00 UTC.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend & Target metrics */}
      <div className="flex flex-wrap items-center justify-between text-xs px-1 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-1 rounded bg-slate-400" />
            <span className="text-[11px]">Actual Close</span>
          </div>

          <div
            className={`flex items-center gap-1.5 transition-opacity ${
              activeModel === "linear" ? "opacity-30" : "opacity-100"
            }`}
          >
            <span className="w-2.5 h-1 rounded bg-brand-emerald shadow-emeraldGlow" />
            <span className="text-[11px] font-bold text-brand-emerald">
              TensorFlow LSTM
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 transition-opacity ${
              activeModel === "lstm" ? "opacity-30" : "opacity-100"
            }`}
          >
            <span className="w-2.5 h-1 rounded bg-brand-cyan" />
            <span className="text-[11px] font-bold text-brand-cyan">
              Baseline Ridge
            </span>
          </div>
        </div>

        {lstmTarget && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-brand-textMuted text-[11px]">7D Drift:</span>
            <span
              className={`font-black flex items-center gap-0.5 ${
                driftPct >= 0 ? "text-brand-emerald" : "text-brand-red"
              }`}
            >
              {driftPct >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {driftPct >= 0 ? "+" : ""}
              {driftPct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Main Multi-Curve Recharts Canvas */}
      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-[380px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255, 255, 255, 0.05)"
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
              minTickGap={20}
            />

            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${symbol}${v}`}
              orientation="left"
            />

            <Tooltip content={<ForecastTooltip />} />

            {/* Vertical Anchor Divider separating historical past from predicted future */}
            {anchorDate && (
              <ReferenceLine
                x={anchorDate}
                stroke="rgba(14, 165, 233, 0.35)"
                strokeDasharray="3 3"
                label={{
                  value: "Today (Horizon Start)",
                  fill: "#0EA5E9",
                  fontSize: 9,
                  position: "insideTopLeft",
                }}
              />
            )}

            {/* 1. Historical Actual Close Line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#94A3B8"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: "#94A3B8" }}
              activeDot={{ r: 5, fill: "#FFFFFF", stroke: "#0A0E17", strokeWidth: 2 }}
              connectNulls={true}
              isAnimationActive={false}
            />

            {/* 2. TensorFlow LSTM Neural Forecast Line */}
            <Line
              type="monotone"
              dataKey="lstm"
              stroke="#00F59B"
              strokeWidth={activeModel === "lstm" ? 3.5 : 2.5}
              strokeDasharray={activeModel === "linear" ? "2 2" : undefined}
              strokeOpacity={activeModel === "linear" ? 0.3 : 1}
              dot={{ r: 3, fill: "#00F59B" }}
              activeDot={{
                r: 6,
                fill: "#00F59B",
                stroke: "#0A0E17",
                strokeWidth: 2,
              }}
              connectNulls={true}
              isAnimationActive={false}
            />

            {/* 3. Baseline Linear Regression Forecast Line */}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#0EA5E9"
              strokeWidth={activeModel === "linear" ? 3.5 : 2}
              strokeDasharray="4 4"
              strokeOpacity={activeModel === "lstm" ? 0.3 : 1}
              dot={{ r: 2.5, fill: "#0EA5E9" }}
              activeDot={{
                r: 5,
                fill: "#0EA5E9",
                stroke: "#0A0E17",
                strokeWidth: 2,
              }}
              connectNulls={true}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Horizon Breakdown */}
      <div className="flex items-center justify-between text-[11px] text-brand-textMuted pt-1 border-t border-white/5">
        <span className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-brand-emerald" />
          <span>Walk-Forward Multivariant Sequence</span>
        </span>
        <span className="text-[10px] text-brand-cyan uppercase tracking-wider font-semibold">
          7 Business Days Horizon
        </span>
      </div>
    </div>
  );
};
