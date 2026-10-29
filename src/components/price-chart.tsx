"use client";

import { CandlestickSeries, ColorType, HistogramSeries, createChart, type UTCTimestamp } from "lightweight-charts";
import { ExternalLink, LineChart } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Point = { time: number; close: number };
const timeframes: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

function TradingViewCanvas({ candles }: { candles: Candle[] }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !candles.length) return;
    const chart = createChart(host, {
      width: host.clientWidth,
      height: 400,
      layout: { background: { type: ColorType.Solid, color: "#0d1118" }, textColor: "#8290a0", fontFamily: "Inter, ui-sans-serif, system-ui", fontSize: 11, attributionLogo: true },
      grid: { vertLines: { color: "#17202a" }, horzLines: { color: "#17202a" } },
      rightPriceScale: { borderColor: "#26313d", scaleMargins: { top: .08, bottom: .24 } },
      timeScale: { borderColor: "#26313d", timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { color: "#52677b", labelBackgroundColor: "#263b50" }, horzLine: { color: "#52677b", labelBackgroundColor: "#263b50" } },
      localization: { priceFormatter: (price: number) => price < .0001 ? price.toExponential(3) : price < .01 ? price.toPrecision(4) : price.toPrecision(5) },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#82b6a3", downColor: "#c47883", borderUpColor: "#82b6a3", borderDownColor: "#c47883", wickUpColor: "#82b6a3", wickDownColor: "#c47883",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "volume",
      lastValueVisible: false, priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: .82, bottom: 0 }, borderVisible: false });
    candleSeries.setData(candles.map(candle => ({ ...candle, time: candle.time as UTCTimestamp })));
    volumeSeries.setData(candles.map(candle => ({ time: candle.time as UTCTimestamp, value: candle.volume, color: candle.close >= candle.open ? "rgba(130,182,163,.35)" : "rgba(196,120,131,.35)" })));
    chart.timeScale().fitContent();
    const resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    resizeObserver.observe(host);
    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, [candles]);

  return <div ref={hostRef} className="h-[320px] w-full md:h-[400px]" />;
}

function SnapshotLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const values = points.map(point => point.close);
  const min = Math.min(...values); const span = Math.max(...values) - min || min || 1;
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"} ${(index / (values.length - 1)) * 100} ${95 - ((value - min) / span) * 85}`).join(" ");
  return <svg viewBox="0 0 100 100" className="h-24 w-full" preserveAspectRatio="none" aria-label="Saved market price snapshots"><path d={path} fill="none" stroke="#91a9bd" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

export function PriceChart({ pairAddress, address, points }: { pairAddress: string; address: string; points: Point[] }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = new URLSearchParams({ address, timeframe });
    if (pairAddress) params.set("pair", pairAddress);
    fetch(`/api/market/chart?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Chart data unavailable."); return data.candles as Candle[]; })
      .then(data => { if (!cancelled) setCandles(data); })
      .catch(reason => { if (!cancelled && reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Chart data unavailable."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [address, pairAddress, timeframe]);

  return <section className="overflow-hidden rounded-xl border border-[#222a34] bg-[#0d1118]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222a34] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><LineChart size={15} className="text-[#9eb4c7]" />Price chart <span className="text-[10px] font-normal text-[#758293]">TradingView Lightweight Charts™</span></div>
      <div className="flex items-center gap-1">{timeframes.map(frame => <button key={frame} type="button" onClick={() => setTimeframe(frame)} className={`rounded px-2 py-1 text-[10px] ${timeframe === frame ? "bg-[#28394a] text-white" : "text-[#8492a0] hover:bg-[#171f29] hover:text-white"}`} aria-pressed={timeframe === frame}>{frame}</button>)}</div>
    </div>
    {loading && !candles.length ? <div className="grid h-[320px] place-items-center text-xs text-[#8391a0]">Loading Solana pool candles…</div> : candles.length ? <TradingViewCanvas candles={candles} /> : <div className="px-4 py-6">{error && <p className="mb-3 text-center text-xs text-[#c7b28b]">{error}</p>}{points.length ? <SnapshotLine points={points} /> : <p className="py-16 text-center text-xs text-[#8391a0]">Chart history is not available yet for this pool.</p>}<p className="text-center text-[10px] text-[#778492]">{pairAddress ? <Link href={`https://www.geckoterminal.com/solana/pools/${encodeURIComponent(pairAddress)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#9eb4c7]">View pool data <ExternalLink size={11} /></Link> : null}</p></div>}
    {error && candles.length > 0 && <p className="px-4 pb-1 text-[10px] text-[#a58f6b]">Refresh note: {error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#202833] px-4 py-2 text-[9px] text-[#718090]"><span>Market OHLCV: GeckoTerminal · live Solana pool candles</span><Link href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="text-[#9eb4c7] hover:text-white">TradingView Lightweight Charts™ · Copyright (c) 2025 TradingView, Inc. <ExternalLink className="ml-1 inline" size={10} /></Link></div>
  </section>;
}
