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
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useCurrency, getStockNativeCurrency } from "../utils/currency";

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
const formatDate = (dateStr, is1D = false) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (is1D || String(dateStr).includes("T") || String(dateStr).includes(":")) {
      return `${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })} • ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
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
const formatTickDate = (dateStr, is1D = false) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (is1D || String(dateStr).includes("T") || String(dateStr).includes(":")) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
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
const CustomTooltip = ({ active, payload, is1D = false, previousClose = null }) => {
  const { formatRaw } = useCurrency();
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const refPrice = is1D && previousClose != null ? previousClose : data.open;
    const isBullish = refPrice != null ? data.close >= refPrice : data.close >= data.open;
    const change = refPrice != null ? data.close - refPrice : data.close - data.open;
    const changePct = refPrice ? (change / refPrice) * 100 : 0;

    return (
      <div className="bg-brand-surface/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[210px] pointer-events-none">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-brand-textMuted text-[11px] font-medium">
            {formatDate(data.date, is1D)}
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
            {data.isSessionOpenAnchor ? "Session Open Tick" : "Price"}
          </div>
          <div className="text-lg font-black text-white">
            {formatRaw(data.close)}
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
              {formatRaw(change)} ({isBullish ? "+" : ""}
              {changePct.toFixed(2)}%)
              {is1D && previousClose != null ? " vs Prev Close" : ""}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] pt-1.5 border-t border-white/5">
          <div>
            <span className="text-brand-textMuted">Open: </span>
            <span className="font-semibold text-white">
              {formatRaw(data.open)}
            </span>
          </div>
          <div>
            <span className="text-brand-textMuted">High: </span>
            <span className="font-semibold text-brand-emerald">
              {formatRaw(data.high)}
            </span>
          </div>
          <div>
            <span className="text-brand-textMuted">Low: </span>
            <span className="font-semibold text-brand-red">
              {formatRaw(data.low)}
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
  timeframe = "1M",
  previousClose = null,
  currency: stockCurrency = null,
  isLoading = false,
  error = null,
  onRetry = null,
}) => {
  const { convert, symbol, formatRaw } = useCurrency();
  const nativeCurrency = getStockNativeCurrency(ticker, stockCurrency);
  const conversionRate = convert(1, nativeCurrency);

  const convertedPrevClose =
    previousClose != null && !isNaN(previousClose) && Number(previousClose) > 0
      ? Number((Number(previousClose) * conversionRate).toFixed(2))
      : null;

  const is1D =
    timeframe === "1D" ||
    (data.length > 0 &&
      (String(data[0].date).includes("T") || String(data[0].date).includes(":")));

  // Chart render mode: "area" (smooth neon) | "line" (precision) | "candles" (OHLC)
  const [chartMode, setChartMode] = useState("area");
  const [showVolume, setShowVolume] = useState(true);

  // Derive metrics and bounds from data converted to active display currency
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

    const activeData =
      conversionRate === 1
        ? data
        : data.map((d) => ({
            ...d,
            open: d.open != null ? Number((d.open * conversionRate).toFixed(2)) : d.open,
            high: d.high != null ? Number((d.high * conversionRate).toFixed(2)) : d.high,
            low: d.low != null ? Number((d.low * conversionRate).toFixed(2)) : d.low,
            close: d.close != null ? Number((d.close * conversionRate).toFixed(2)) : d.close,
          }));

    let processedData = activeData;

    // For 1D intraday mode, anchor the continuous line/area curve to the session opening price tick
    if (is1D && activeData.length > 0 && chartMode !== "candles") {
      const firstBar = activeData[0];
      if (firstBar && firstBar.open != null && firstBar.open !== firstBar.close) {
        let intervalMs = 5 * 60 * 1000;
        if (activeData.length > 1) {
          const t0 = new Date(activeData[0].date).getTime();
          const t1 = new Date(activeData[1].date).getTime();
          if (!isNaN(t0) && !isNaN(t1) && t1 > t0 && t1 - t0 <= 30 * 60 * 1000) {
            intervalMs = t1 - t0;
          }
        }

        const shiftedBars = activeData.map((d) => {
          const t = new Date(d.date).getTime();
          if (!isNaN(t)) {
            return {
              ...d,
              date: new Date(t + intervalMs).toISOString(),
            };
          }
          return d;
        });

        const openPoint = {
          ...firstBar,
          close: firstBar.open,
          high: firstBar.open,
          low: firstBar.open,
          volume: 0,
          isSessionOpenAnchor: true,
        };

        processedData = [openPoint, ...shiftedBars];
      }
    }

    const highs = processedData.map((d) => d.high || d.close);
    const lows = processedData.map((d) => d.low || d.close);
    const volumes = processedData.map((d) => d.volume || 0);

    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const maxVol = Math.max(...volumes);

    // If previous close is available, ensure chart vertical domain encompasses it
    if (convertedPrevClose != null && convertedPrevClose > 0) {
      min = Math.min(min, convertedPrevClose);
      max = Math.max(max, convertedPrevClose);
    }

    const priceSpan = max - min;
    // Institutional 20% vertical padding for 1D ensures price curve floats freely without ceiling/floor clipping
    const paddingFactor = is1D ? 0.20 : 0.08;
    const padding = priceSpan > 0 ? priceSpan * paddingFactor : (min * 0.02 || 1);

    let yMin = Math.max(0, min - padding);
    let yMax = max + padding;

    if (priceSpan > 20) {
      yMin = Math.floor(yMin);
      yMax = Math.ceil(yMax);
    } else if (priceSpan > 2) {
      yMin = Math.floor(yMin * 2) / 2;
      yMax = Math.ceil(yMax * 2) / 2;
    } else {
      yMin = Math.floor(yMin * 10) / 10;
      yMax = Math.ceil(yMax * 10) / 10;
    }

    const lastPrice = processedData[processedData.length - 1]?.close || 1;
    let change = 0;
    let changePct = 0;

    if (is1D && convertedPrevClose != null && convertedPrevClose > 0) {
      // Standard financial convention: 1D return is benchmarked against Previous Close
      change = lastPrice - convertedPrevClose;
      changePct = (change / convertedPrevClose) * 100;
    } else {
      const firstPrice = processedData[0]?.close || 1;
      change = lastPrice - firstPrice;
      changePct = firstPrice ? (change / firstPrice) * 100 : 0;
    }

    return {
      chartData: processedData,
      minPrice: yMin,
      maxPrice: yMax,
      maxVolume: maxVol,
      periodChange: change,
      periodChangePercent: changePct,
      isPositive: change >= 0,
    };
  }, [data, conversionRate, convertedPrevClose, is1D, chartMode]);

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
          <span className="text-[11px] text-brand-textMuted">
            {is1D ? "Session Return:" : "Period Return:"}
          </span>
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
            {formatRaw(periodChange)} ({isPositive ? "+" : ""}
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
      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-[380px] select-none">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 14, right: convertedPrevClose != null ? 36 : 12, left: -20, bottom: 0 }}
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

            {/* Previous Close Reference Line (Google Finance / Institutional Benchmark) */}
            {convertedPrevClose != null && (
              <ReferenceLine
                yAxisId="price"
                y={convertedPrevClose}
                stroke="#64748B"
                strokeDasharray="4 4"
                strokeWidth={1.2}
                label={{
                  value: `Prev Close ${symbol}${convertedPrevClose}`,
                  position: "insideTopRight",
                  fill: "#94A3B8",
                  fontSize: 10,
                  fontWeight: 600,
                  offset: 6,
                }}
              />
            )}

            <XAxis
              dataKey="date"
              tickFormatter={(val) => formatTickDate(val, is1D)}
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
              minTickGap={is1D ? 35 : 25}
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

            <Tooltip content={<CustomTooltip is1D={is1D} previousClose={convertedPrevClose} />} />

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
          {convertedPrevClose != null && (
            <span className="flex items-center gap-1.5 text-slate-400 font-mono">
              <span className="w-3 border-t border-dashed border-slate-400 inline-block" />
              Prev Close: {symbol}{convertedPrevClose}
            </span>
          )}
          <button
            onClick={() => setShowVolume((prev) => !prev)}
            className={`hover:text-white transition-colors ${
              showVolume ? "text-brand-textSecondary" : "text-brand-textMuted line-through"
            }`}
          >
            Volume Overlay
          </button>
        </div>
        <span className="text-[10px] tracking-wider uppercase font-semibold font-mono">
          {is1D ? "Data Stream: 5-Min Intraday Ticks" : "Data Stream: Daily OHLCV"}
        </span>
      </div>
    </div>
  );
};
