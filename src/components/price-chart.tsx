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
      height: host.clientHeight || 440,
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
      const { width, height } = entries[0]?.contentRect ?? {};
      if (width && height) chart.applyOptions({ width, height });
    });
    resizeObserver.observe(host);
    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, [candles]);

  return <div ref={hostRef} className="h-[340px] w-full md:h-[460px]" />;
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
  const [loadedTimeframe, setLoadedTimeframe] = useState<Timeframe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRequestVersion(version => version + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true); setError("");
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (!cancelled) { setError("Chart request timed out. Try again."); setLoading(false); }
    }, 15_000);
    const params = new URLSearchParams({ address, timeframe });
    if (pairAddress) params.set("pair", pairAddress);
    fetch(`/api/market/chart?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Chart data unavailable."); return data.candles as Candle[]; })
      .then(data => {
        if (!Array.isArray(data) || data.length < 2) throw new Error("There are not enough candles for this interval yet.");
        if (!cancelled) { setCandles(data); setLoadedTimeframe(timeframe); setError(""); }
      })
      .catch(reason => { if (!cancelled && reason.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Chart data unavailable."); })
      .finally(() => { window.clearTimeout(timeout); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(timeout); controller.abort(); };
  }, [address, pairAddress, timeframe, requestVersion]);

  const chartReady = candles.length > 0 && loadedTimeframe === timeframe;
  function retry() { setError(""); setRequestVersion(version => version + 1); }

  return <section className="overflow-hidden rounded-xl border border-[#222a34] bg-[#0d1118]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222a34] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><LineChart size={15} className="text-[#9eb4c7]" />Price chart <span className="text-[10px] font-normal text-[#758293]">TradingView Lightweight Charts™</span></div>
      <div className="flex items-center gap-1">{timeframes.map(frame => <button key={frame} type="button" onClick={() => setTimeframe(frame)} className={`rounded px-2 py-1 text-[10px] ${timeframe === frame ? "bg-[#28394a] text-white" : "text-[#8492a0] hover:bg-[#171f29] hover:text-white"}`} aria-pressed={timeframe === frame}>{frame}</button>)}</div>
    </div>
    {!chartReady ? <div className="grid h-[340px] place-items-center px-4 text-center md:h-[460px]">{loading && !error ? <div className="text-xs text-[#8391a0]"><span className="mx-auto mb-2 block h-4 w-4 animate-spin rounded-full border-2 border-[#53677a] border-t-transparent" />Loading {timeframe} Solana pool candles…</div> : <div>{error && <p className="mb-3 text-xs text-[#c7b28b]">{error}</p>}{points.length > 1 && <SnapshotLine points={points} />}<p className="py-3 text-xs text-[#8391a0]">{points.length > 1 ? "Showing saved price snapshots while pool candles are unavailable." : "Chart history is not available yet for this pool."}</p><button type="button" onClick={retry} className="rounded border border-[#394b5c] bg-[#172330] px-3 py-1.5 text-[10px] text-[#c7d6e2] hover:bg-[#203244]">Retry chart</button>{pairAddress && <Link href={`https://www.geckoterminal.com/solana/pools/${encodeURIComponent(pairAddress)}`} target="_blank" rel="noreferrer" className="ml-3 inline-flex items-center gap-1 text-[10px] text-[#9eb4c7]">Open pool <ExternalLink size={11} /></Link>}</div>}</div> : <div className="relative"><TradingViewCanvas candles={candles} />{loading && <span className="absolute right-3 top-3 rounded border border-[#2c3a47] bg-[#111923]/90 px-2 py-1 text-[9px] text-[#8b9baa]">Updating</span>}{error && <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded border border-[#5a4730] bg-[#1c1710]/95 px-3 py-2 text-[10px] text-[#d5bc8c]"><span>{error}</span><button type="button" onClick={retry} className="shrink-0 underline">Retry</button></div>}</div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#202833] px-4 py-2 text-[9px] text-[#718090]"><span>Market OHLCV: GeckoTerminal · live Solana pool candles</span><Link href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="text-[#9eb4c7] hover:text-white">TradingView Lightweight Charts™ · Copyright (c) 2025 TradingView, Inc. <ExternalLink className="ml-1 inline" size={10} /></Link></div>
  </section>;
}
