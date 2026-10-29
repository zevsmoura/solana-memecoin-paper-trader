"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Flame, ListFilter } from "lucide-react";
import { usd } from "@/lib/money";
import type { TokenMarket } from "@/lib/price-provider";
import { TokenImage } from "@/components/token-image";

type View = "trending" | "new" | "volume" | "gainers";
const views: { id: View; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New pairs" },
  { id: "volume", label: "Top volume" },
  { id: "gainers", label: "Top gainers" },
];

function pairAge(createdAt?: number | null) {
  if (!createdAt) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function change(value = 0) {
  return <span className={value >= 0 ? "positive" : "negative"}>{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

export function TokenTable({ tokens, query = "" }: { tokens: TokenMarket[]; query?: string }) {
  const [view, setView] = useState<View>(query ? "volume" : "trending");
  const rows = useMemo(() => [...tokens].sort((a, b) => {
    if (view === "new") return (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0);
    if (view === "gainers") return (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0);
    return b.volume24h - a.volume24h || b.liquidityUsd - a.liquidityUsd;
  }), [tokens, view]);

  return <section className="overflow-hidden rounded-xl border border-[#222a34] bg-[#0d1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222a34] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Flame size={16} className="text-[#b6f266]" />{query ? `Search: ${query}` : "Explore markets"}</div>
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[#9ba8b6]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8ce9b2]" /> Live Solana data</span>
    </div>
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#222a34] px-3 pt-2">
      {views.map(item => <button key={item.id} type="button" onClick={() => setView(item.id)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs transition ${view === item.id ? "border-[#a7ef61] text-white" : "border-transparent text-[#85919f] hover:text-white"}`}>{item.label}</button>)}
      <span className="ml-auto hidden items-center gap-1 pb-2.5 pr-2 text-xs text-[#85919f] sm:flex"><ListFilter size={13} />{rows.length} markets</span>
    </div>
    {!rows.length ? <div className="px-6 py-16 text-center"><p className="text-sm text-[#e1e7ed]">No matching Solana markets</p><p className="mt-2 text-xs text-[#8793a1]">Search by token name, ticker, or exact mint address.</p></div> : <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-[#10151d] text-[10px] uppercase tracking-[.12em] text-[#758293]"><tr>
          <th className="px-4 py-3 font-medium">Token / mint</th><th className="px-3 py-3 text-right font-medium">Price</th>
          <th className="hidden px-3 py-3 text-right font-medium md:table-cell">1h</th><th className="hidden px-3 py-3 text-right font-medium lg:table-cell">6h</th>
          <th className="px-3 py-3 text-right font-medium">24h</th><th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Liquidity</th>
          <th className="px-3 py-3 text-right font-medium">Volume</th><th className="hidden px-3 py-3 text-right font-medium xl:table-cell">MCap / FDV</th>
          <th className="hidden px-3 py-3 text-right font-medium lg:table-cell">Pair age</th><th className="px-4 py-3 text-right font-medium">Trade</th>
        </tr></thead>
        <tbody>{rows.map(token => <tr key={token.address.toLowerCase()} className="border-t border-[#1c232d] transition hover:bg-[#151b24]">
          <td className="px-4 py-3"><Link href={`/token/${token.address}`} className="flex min-w-[190px] items-center gap-2.5">
            <TokenImage src={token.imageUrl} symbol={token.symbol} size={34} />
            <span className="min-w-0"><strong className="block max-w-[180px] truncate text-[13px] font-semibold text-[#eef2f5]">{token.name}</strong><span className="mt-0.5 block font-mono text-[10px] text-[#818d9b]">{token.symbol} · {token.address.slice(0, 4)}…{token.address.slice(-4)}</span></span>
          </Link></td>
          <td className="px-3 py-3 text-right font-mono text-[#e6ebf1]">{usd(Number(token.priceUsd))}</td>
          <td className="hidden px-3 py-3 text-right md:table-cell">{change(token.priceChange1h)}</td><td className="hidden px-3 py-3 text-right lg:table-cell">{change(token.priceChange6h)}</td>
          <td className="px-3 py-3 text-right">{change(token.priceChange24h)}</td><td className="hidden px-3 py-3 text-right text-[#aab4bf] sm:table-cell">{usd(token.liquidityUsd)}</td>
          <td className="px-3 py-3 text-right text-[#aab4bf]">{usd(token.volume24h)}</td><td className="hidden px-3 py-3 text-right text-[#aab4bf] xl:table-cell">{token.marketCap ? usd(token.marketCap) : "—"}</td>
          <td className="hidden px-3 py-3 text-right text-[#aab4bf] lg:table-cell">{pairAge(token.pairCreatedAt)}</td>
          <td className="px-4 py-3 text-right"><Link href={`/token/${token.address}`} className="inline-flex items-center gap-1 rounded-md bg-[#a9f05e] px-2.5 py-1.5 font-semibold text-[#10170a] hover:bg-[#c4ff7a]">Trade <ArrowUpRight size={13} /></Link></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#222a34] px-4 py-2.5 text-[10px] text-[#758293]">
      <span>Market data from DexScreener · prices may be delayed</span><span>Mint addresses are shown to help spot impersonators</span>
    </div>
  </section>;
}
