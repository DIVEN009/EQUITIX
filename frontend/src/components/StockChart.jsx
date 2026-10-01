import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useCurrency } from "../utils/currency";

/**
 * Format raw numbers into compact readable volumes (e.g. 42.5M, 1.2B)
 */
const formatVolume = (vol) => {
  if (!vol || isNaN(vol)) return "0";
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return vol.toLocaleString();
};

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
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/**
 * Short tick formatter for X-Axis
 */
const formatTickDate = (dateStr) => {
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
 * Custom dark-glass tooltip matching Equitix institutional aesthetic
 */
const CustomTooltip = ({ active, payload }) => {
  const { format: formatRupee } = useCurrency();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isBullish = data.close >= data.open;
    const dayChange = data.close - data.open;
    const dayChangePct = data.open ? (dayChange / data.open) * 100 : 0;

    return (
      <div className="bg-brand-surface/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[190px] pointer-events-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-brand-textMuted text-[11px] font-medium">
            {formatDate(data.date)}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isBullish
                ? "bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20"
                : "bg-red-500/10 text-brand-red border border-brand-red/20"
            }`}
          >
            {isBullish ? "+Bullish" : "-Bearish"}
          </span>
        </div>

        <div>
          <div className="text-[10px] text-brand-textMuted uppercase font-semibold tracking-wider">
            Closing Price
          </div>
          <div className="text-lg font-black text-white">
            {formatRupee(data.close)}
          </div>
          <div
            className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
              isBullish ? "text-brand-emerald" : "text-brand-red"
            }`}
          >
            {isBullish ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {isBullish ? "+" : ""}
              {formatRupee(dayChange)} ({isBullish ? "+" : ""}
              {dayChangePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] pt-1.5 border-t border-white/5">
          <div>
            <span className="text-brand-textMuted">Open: </span>
            <span className="font-semibold text-white">
              {formatRupee(data.open)}
            </span>
          </div>
          <div>
            <span className="text-brand-textMuted">High: </span>
            <span className="font-semibold text-brand-emerald">
              {formatRupee(data.high)}
            </span>
          </div>
          <div>
            <span className="text-brand-textMuted">Low: </span>
            <span className="font-semibold text-brand-red">
              {formatRupee(data.low)}
            </span>
          </div>
          <div>
            <span className="text-brand-textMuted">Vol: </span>
            <span className="font-semibold text-brand-textSecondary">
              {formatVolume(data.volume)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Custom Candlestick shape for Recharts Bar
 */
const CandlestickShape = (props) => {
  const { x, width, payload, yAxisMin, yAxisMax, chartHeight } = props;
  if (!payload || yAxisMin === undefined || yAxisMax === undefined || !chartHeight) return null;

  const { open, close, high, low } = payload;
  const isBullish = close >= open;
  const color = isBullish ? "#00F59B" : "#EF4444";

  // Linear projection from price to Y coordinate
  const range = yAxisMax - yAxisMin;
  if (range <= 0) return null;

  const toY = (val) => chartHeight - ((val - yAxisMin) / range) * chartHeight;

  const yOpen = toY(open);
  const yClose = toY(close);
  const yHigh = toY(high);
  const yLow = toY(low);

  const candleWidth = Math.max(3, Math.min(width * 0.7, 12));
  const candleX = x + (width - candleWidth) / 2;
  const bodyY = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
  const wickX = x + width / 2;

  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={wickX}
        y1={yHigh}
        x2={wickX}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Open-Close Body */}
      <rect
        x={candleX}
        y={bodyY}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
        opacity={0.9}
      />
    </g>
  );
};

export const StockChart = ({
  data = [],
  ticker = "",
  isLoading = false,
  error = null,
  onRetry = null,
}) => {
  const { format: formatRupee, symbol } = useCurrency();
  // Chart render mode: "area" (smooth neon) | "line" (precision) | "candles" (OHLC)
  const [chartMode, setChartMode] = useState("area");
  const [showVolume, setShowVolume] = useState(true);

  // Derive metrics and bounds from data
  const {
    chartData,
    minPrice,
    maxPrice,
    maxVolume,
    periodChange,
    periodChangePercent,
    isPositive,
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        chartData: [],
        minPrice: 0,
        maxPrice: 100,
        maxVolume: 0,
        periodChange: 0,
        periodChangePercent: 0,
        isPositive: true,
      };
    }

    const highs = data.map((d) => d.high || d.close);
    const lows = data.map((d) => d.low || d.close);
    const volumes = data.map((d) => d.volume || 0);

    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const maxVol = Math.max(...volumes);

    const padding = (max - min) * 0.05 || 1;
    const yMin = Math.max(0, Math.floor(min - padding));
    const yMax = Math.ceil(max + padding);

    const firstPrice = data[0]?.close || 1;
    const lastPrice = data[data.length - 1]?.close || 1;
    const change = lastPrice - firstPrice;
    const changePct = firstPrice ? (change / firstPrice) * 100 : 0;

    return {
      chartData: data,
      minPrice: yMin,
      maxPrice: yMax,
      maxVolume: maxVol,
      periodChange: change,
      periodChangePercent: changePct,
      isPositive: change >= 0,
    };
  }, [data]);

  const themeColor = isPositive ? "#00F59B" : "#EF4444";
  const gradientId = `stockGradient_${ticker}_${isPositive ? "up" : "down"}`;

  if (isLoading) {
    return (
      <div className="h-64 bg-brand-surface/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-3">
        <div className="relative">
          <RefreshCw className="w-8 h-8 text-brand-emerald animate-spin" />
        </div>
        <span className="font-medium tracking-wide">
          Streaming time-series OHLCV history...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 bg-brand-surface/40 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center text-xs p-6 text-center gap-3">
        <AlertCircle className="w-8 h-8 text-brand-red" />
        <div>
          <p className="font-semibold text-white">Historical Data Unavailable</p>
          <p className="text-brand-textMuted text-[11px] mt-1 max-w-xs">
            {error?.message || "Failed to load market OHLCV bars. Please verify your connection."}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 rounded-xl bg-brand-surface border border-white/10 hover:border-brand-emerald/40 text-brand-emerald font-bold text-xs transition-colors"
          >
            Retry Fetch
          </button>
        )}
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 bg-brand-surface/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-brand-textMuted text-xs gap-2">
        <Layers className="w-8 h-8 text-brand-textMuted/40" />
        <span>No historical price bars recorded for this lookback window.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart Top Utility Bar: Mode selector & Period Performance */}
      <div className="flex items-center justify-between text-xs px-1">
        {/* Period Net Return Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-brand-textMuted">Period Return:</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              isPositive ? "text-brand-emerald" : "text-brand-red"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {isPositive ? "+" : ""}
            {formatRupee(periodChange)} ({isPositive ? "+" : ""}
            {periodChangePercent.toFixed(2)}%)
          </span>
        </div>

        {/* View Mode Switcher [Area | Line | Candles] */}
        <div className="flex items-center gap-1 bg-brand-surface/80 p-0.5 rounded-xl border border-white/5">
          <button
            onClick={() => setChartMode("area")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              chartMode === "area"
                ? "bg-brand-card text-brand-emerald font-bold shadow-sm border border-white/10"
                : "text-brand-textMuted hover:text-white"
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartMode("line")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              chartMode === "line"
                ? "bg-brand-card text-brand-emerald font-bold shadow-sm border border-white/10"
                : "text-brand-textMuted hover:text-white"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartMode("candles")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              chartMode === "candles"
                ? "bg-brand-card text-brand-emerald font-bold shadow-sm border border-white/10"
                : "text-brand-textMuted hover:text-white"
            }`}
          >
            Candles
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="w-full h-56 md:h-64 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255, 255, 255, 0.05)"
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatTickDate}
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
              minTickGap={25}
            />

            {/* Primary Price Axis */}
            <YAxis
              yAxisId="price"
              domain={[minPrice, maxPrice]}
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${symbol}${v}`}
              orientation="left"
            />

            {/* Secondary Volume Axis (Hidden overlay occupying bottom 25%) */}
            <YAxis
              yAxisId="volume"
              domain={[0, maxVolume * 4 || 1]}
              hide={true}
              orientation="right"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Volume sub-overlay bars */}
            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="rgba(255, 255, 255, 0.07)"
                radius={[2, 2, 0, 0]}
                maxBarSize={8}
                isAnimationActive={false}
              />
            )}

            {/* Chart Mode Renderers */}
            {chartMode === "area" && (
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={themeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: themeColor,
                  stroke: "#0A0E17",
                  strokeWidth: 2,
                }}
              />
            )}

            {chartMode === "line" && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={themeColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: themeColor,
                  stroke: "#0A0E17",
                  strokeWidth: 2,
                }}
              />
            )}

            {chartMode === "candles" && (
              <Bar
                yAxisId="price"
                dataKey="close"
                isAnimationActive={false}
                shape={(props) => (
                  <CandlestickShape
                    {...props}
                    yAxisMin={minPrice}
                    yAxisMax={maxPrice}
                    chartHeight={200}
                  />
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Legend / Sub-Controls */}
      <div className="flex items-center justify-between text-[11px] text-brand-textMuted pt-1 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: themeColor }}
            />
            {ticker} Close
          </span>
          <button
            onClick={() => setShowVolume((prev) => !prev)}
            className={`hover:text-white transition-colors ${
              showVolume ? "text-brand-textSecondary" : "text-brand-textMuted line-through"
            }`}
          >
            Volume Overlay
          </button>
        </div>
        <span className="text-[10px] tracking-wider uppercase font-semibold">
          Data Stream: Daily OHLCV
        </span>
      </div>
    </div>
  );
};
