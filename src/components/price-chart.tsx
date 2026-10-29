"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, LineChart } from "lucide-react";

type Point = { time: number; close: number };

function SnapshotLine({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const values = points.map(point => point.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max || 1;
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"} ${(index / (values.length - 1)) * 100} ${95 - ((value - min) / span) * 85}`).join(" ");
  const up = values.at(-1)! >= values[0]!;
  return <div className="border-t border-[#222a34] px-4 py-2">
    <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-[#687585]"><span>Saved snapshots</span><span>{points.length} points</span></div>
    <svg viewBox="0 0 100 100" className="h-12 w-full" preserveAspectRatio="none" aria-label="Saved market price snapshots">
      <path d={path} fill="none" stroke={up ? "#a9f05e" : "#ff8294"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  </div>;
}

export function PriceChart({ pairAddress, address, points }: { pairAddress: string; address: string; points: Point[] }) {
  const [failed, setFailed] = useState(false);
  const pool = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pairAddress) ? pairAddress : "";
  const src = pool
    ? `https://www.geckoterminal.com/solana/pools/${encodeURIComponent(pool)}?embed=1&info=0&swaps=0&light_chart=0&chart_type=price&resolution=1h&bg_color=0d1118`
    : "";
  return <section className="overflow-hidden rounded-xl border border-[#222a34] bg-[#0d1118]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222a34] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><LineChart size={15} className="text-[#b6f266]" />Price chart</div>
      <span className="text-[10px] text-[#7f8b99]">Interactive · 1h candles · GeckoTerminal</span>
    </div>
    {src && !failed ? <iframe
      title="Interactive Solana token price chart"
      src={src}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="clipboard-write"
      allowFullScreen
      onError={() => setFailed(true)}
      className="block h-[340px] w-full border-0 bg-[#0d1118] md:h-[440px]"
    /> : <div className="grid h-[240px] place-items-center px-6 text-center">
      <div><p className="text-sm text-[#d5dce3]">Chart preview unavailable</p><p className="mt-1 text-xs text-[#7f8b99]">Open the pool on GeckoTerminal for its live chart.</p><Link href={`https://www.geckoterminal.com/solana/tokens/${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-[#b6f266]">Open GeckoTerminal <ExternalLink size={12} /></Link></div>
    </div>}
    <SnapshotLine points={points} />
  </section>;
}
