"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Flame, ListFilter } from "lucide-react";
import { usd } from "@/lib/money";
import type { TokenMarket } from "@/lib/price-provider";
import { TokenImage } from "@/components/token-image";

type View = "trending" | "new" | "volume" | "gainers";
type SortKey = "marketCap" | "change" | "volume" | "liquidity" | "age" | "price";
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
  const [liveTokens, setLiveTokens] = useState(tokens);
  const [view, setView] = useState<View>(query ? "volume" : "trending");
  const [sort, setSort] = useState<{ key: SortKey; direction: 1 | -1 } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setLiveTokens(tokens); }, [tokens]);
  useEffect(() => {
    if (query) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      setRefreshing(true);
      try {
        const response = await fetch("/api/market/discovery", { cache: "no-store" });
        const data = await response.json();
        if (response.ok && active && Array.isArray(data.tokens)) setLiveTokens(data.tokens as TokenMarket[]);
      } catch { /* Keep the last successful market snapshot visible. */ }
      finally { if (active) setRefreshing(false); }
    };
    const timer = window.setInterval(refresh, 45_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [query]);

  const rows = useMemo(() => [...liveTokens].sort((a, b) => {
    if (sort) {
      const values: Record<SortKey, [number, number]> = {
        marketCap: [a.marketCap ?? -1, b.marketCap ?? -1], change: [a.priceChange24h, b.priceChange24h],
        volume: [a.volume24h, b.volume24h], liquidity: [a.liquidityUsd, b.liquidityUsd],
        age: [a.pairCreatedAt ?? 0, b.pairCreatedAt ?? 0], price: [Number(a.priceUsd), Number(b.priceUsd)],
      };
      const [av, bv] = values[sort.key];
      return (av - bv) * sort.direction;
    }
    if (view === "new") return (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0);
    if (view === "gainers") return (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0);
    return b.volume24h - a.volume24h || b.liquidityUsd - a.liquidityUsd;
  }), [liveTokens, view, sort]);

  function sortHeader(key: SortKey, label: string, classes = "") {
    const selected = sort?.key === key;
    return <button type="button" onClick={() => setSort(current => current?.key === key ? { key, direction: current.direction === 1 ? -1 : 1 } : { key, direction: key === "age" ? 1 : -1 })} className={`inline-flex items-center gap-1 hover:text-[#dbe6ee] ${classes}`} title={`Sort by ${label} ${selected ? sort.direction === -1 ? "descending" : "ascending" : "descending"}`}>{label}<span aria-hidden="true" className="text-[#9eb4c7]">{selected ? sort.direction === -1 ? "↓" : "↑" : "↕"}</span></button>;
  }

  return <section className="overflow-hidden rounded-xl border border-[#222a34] bg-[#0d1118]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222a34] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold"><Flame size={16} className="text-[#9eb4c7]" />{query ? `Search: ${query}` : "Explore markets"}</div>
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[#9ba8b6]"><span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "animate-pulse bg-[#9eb4c7]" : "bg-[#82b6a3]"}`} />{refreshing ? "Refreshing markets" : "Live Solana data"}</span>
    </div>
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[#222a34] px-3 pt-2">
      {views.map(item => <button key={item.id} type="button" onClick={() => { setView(item.id); setSort(null); }} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs transition ${view === item.id && !sort ? "border-[#8fa9bf] text-white" : "border-transparent text-[#85919f] hover:text-white"}`}>{item.label}</button>)}
      <span className="ml-auto hidden items-center gap-1 pb-2.5 pr-2 text-xs text-[#85919f] sm:flex"><ListFilter size={13} />{rows.length} markets</span>
    </div>
    {!rows.length ? <div className="px-6 py-16 text-center"><p className="text-sm text-[#e1e7ed]">No matching Solana markets</p><p className="mt-2 text-xs text-[#8793a1]">Search by token name, ticker, or exact mint address.</p></div> : <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-[#10151d] text-[10px] uppercase tracking-[.12em] text-[#758293]"><tr>
          <th className="px-4 py-3 font-medium">Token / mint</th><th className="px-3 py-3 text-right font-medium text-[#b4c5d3]">{sortHeader("marketCap", "MCap / FDV")}</th>
          <th className="px-3 py-3 text-right font-medium">{sortHeader("change", "24h")}</th><th className="hidden px-3 py-3 text-right font-medium sm:table-cell">{sortHeader("volume", "Volume")}</th>
          <th className="hidden px-3 py-3 text-right font-medium md:table-cell">{sortHeader("liquidity", "Liquidity")}</th><th className="hidden px-3 py-3 text-right font-medium lg:table-cell">{sortHeader("age", "Pair age")}</th>
          <th className="hidden px-3 py-3 text-right font-medium xl:table-cell">{sortHeader("price", "Price")}</th><th className="px-4 py-3 text-right font-medium">Trade</th>
        </tr></thead>
        <tbody>{rows.map(token => <tr key={token.address.toLowerCase()} className="border-t border-[#1c232d] transition hover:bg-[#151b24]">
          <td className="px-4 py-3"><Link href={`/token/${token.address}`} className="flex min-w-[190px] items-center gap-2.5">
            <TokenImage src={token.imageUrl} symbol={token.symbol} size={34} />
            <span className="min-w-0"><strong className="block max-w-[180px] truncate text-[13px] font-semibold text-[#eef2f5]">{token.name}</strong><span className="mt-0.5 block font-mono text-[10px] text-[#818d9b]">{token.symbol} · {token.address.slice(0, 4)}…{token.address.slice(-4)}</span></span>
          </Link></td>
          <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-[#e3ebf1]">{token.marketCap ? usd(token.marketCap) : "—"}</td>
          <td className="px-3 py-3 text-right">{change(token.priceChange24h)}</td><td className="hidden px-3 py-3 text-right text-[#aab4bf] sm:table-cell">{usd(token.volume24h)}</td>
          <td className="hidden px-3 py-3 text-right text-[#aab4bf] md:table-cell">{usd(token.liquidityUsd)}</td><td className="hidden px-3 py-3 text-right text-[#aab4bf] lg:table-cell">{pairAge(token.pairCreatedAt)}</td>
          <td className="hidden px-3 py-3 text-right font-mono text-[#9aa8b6] xl:table-cell">{usd(Number(token.priceUsd))}</td>
          <td className="px-4 py-3 text-right"><Link href={`/token/${token.address}`} className="inline-flex items-center gap-1 rounded-md border border-[#53687c] bg-[#28394a] px-2.5 py-1.5 font-semibold text-[#d2e0eb] hover:bg-[#344b60]">Trade <ArrowUpRight size={13} /></Link></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#222a34] px-4 py-2.5 text-[10px] text-[#758293]">
      <span>Market data from DexScreener · prices may be delayed</span><span>Mint addresses are shown to help spot impersonators</span>
    </div>
  </section>;
}
