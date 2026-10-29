import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ExternalLink, ShieldCheck } from "lucide-react";
import { Header } from "@/components/header";
import { PriceChart } from "@/components/price-chart";
import { TokenImage } from "@/components/token-image";
import { TradePanel } from "@/components/trade-panel";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MIN_LIQUIDITY_USD } from "@/lib/config";
import { usd } from "@/lib/money";
import { getSolUsd, getToken, type TokenMarket } from "@/lib/price-provider";
import { getStoredChart, getStoredToken, saveMarketData } from "@/lib/market-store";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  let token: TokenMarket;
  let live = true;
  try {
    token = await getToken(address);
    await saveMarketData([token]).catch(() => undefined);
  } catch {
    const stored = await getStoredToken(address).catch(() => null);
    if (!stored) notFound();
    token = stored;
    live = false;
  }

  const [user, snapshots, solPrice] = await Promise.all([
    currentUser(),
    getStoredChart(token.address).catch(() => []),
    getSolUsd().catch(() => 150),
  ]);
  const holding = user ? await db.holding.findUnique({ where: { userId_tokenAddress: { userId: user.id, tokenAddress: token.address } }, select: { quantity: true } }).catch(() => null) : null;
  const dexUrl = token.pairAddress ? `https://dexscreener.com/solana/${token.pairAddress}` : `https://dexscreener.com/solana/${token.address}`;
  const buys = token.buys24h ?? 0;
  const sells = token.sells24h ?? 0;

  return <>
    <Header />
    <main className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 md:px-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-xs text-[#8b98a6] hover:text-white">← Markets</Link>
        <div className="flex items-center gap-2 text-[10px] text-[#7f8c99]"><span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#91a9bd]" : "bg-amber-400"}`} />{live ? "Live market" : "Saved snapshot"}<span>·</span>Solana</div>
      </div>

      {!live && <p className="mb-3 rounded-lg border border-[#624b2d] bg-[#251d12] px-3 py-2 text-xs text-[#f1cb82]">Current provider data is unavailable. This saved quote is for reference only; trading is disabled until live pricing returns.</p>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 space-y-3">
          <div className="rounded-xl border border-[#222a34] bg-[#0d1118] p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <TokenImage src={token.imageUrl} symbol={token.symbol} size={48} />
                <div className="min-w-0"><h1 className="truncate text-xl font-semibold text-[#f0f3f6]">{token.name} <span className="text-[#8995a2]">${token.symbol}</span></h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] text-[#8a96a4]">{token.address.slice(0, 8)}…{token.address.slice(-7)}</span><span className="rounded bg-[#171e27] px-1.5 py-0.5 text-[9px] text-[#929eac]">{token.dexId}</span><span className="rounded bg-[#1a2632] px-1.5 py-0.5 text-[9px] text-[#b1c2d0]">SOLANA</span></div>
                </div>
              </div>
              <a href={dexUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-[#2a333e] px-2.5 py-2 text-[11px] text-[#aab4c0] hover:bg-[#171e27]">DexScreener <ExternalLink size={12} /></a>
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[10px] uppercase tracking-[.16em] text-[#7d8b99]">Market cap / FDV</p><strong className="mt-1 block font-mono text-3xl font-semibold tracking-tight text-[#e5edf3]">{token.marketCap ? usd(token.marketCap) : "—"}</strong></div>
              <div className="flex items-end gap-3 pb-1"><div><p className="text-[9px] uppercase tracking-wide text-[#778391]">Token price</p><strong className="mt-1 block font-mono text-sm font-medium text-[#aeb9c3]">{usd(Number(token.priceUsd))}</strong></div>
                <span className={`mb-0.5 rounded-md border border-[#26313a] bg-[#141a21] px-2 py-1 text-[10px] font-medium ${(token.priceChange24h ?? 0) >= 0 ? "positive" : "negative"}`}>{(token.priceChange24h ?? 0) >= 0 ? "+" : ""}{(token.priceChange24h ?? 0).toFixed(2)}% <span className="text-[#758190]">24h</span></span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Liquidity", value: usd(token.liquidityUsd) },
              { label: "24h volume", value: usd(token.volume24h) },
              { label: "1h change", value: `${(token.priceChange1h ?? 0).toFixed(2)}%` },
              { label: "6h change", value: `${(token.priceChange6h ?? 0).toFixed(2)}%` },
              { label: "24h buys / sells", value: `${buys.toLocaleString()} / ${sells.toLocaleString()}` },
            ].map(item => <div key={item.label} className="rounded-lg border border-[#202833] bg-[#0d1118] px-3 py-2.5"><p className="text-[9px] uppercase tracking-wide text-[#758293]">{item.label}</p><strong className="mt-1 block truncate text-xs font-semibold text-[#dbe1e8]">{item.value}</strong></div>)}
          </div>

          <PriceChart pairAddress={token.pairAddress} address={token.address} points={snapshots} />
        </section>

        <aside className="space-y-3 xl:sticky xl:top-4">
          <TradePanel address={token.address} symbol={token.symbol} price={Number(token.priceUsd)} solPrice={solPrice} loggedIn={!!user} marketLive={live} holdingQuantity={holding?.quantity ?? "0"} balanceSol={user ? (Number(user.balance) / 1_000_000_000).toFixed(4) : "10.0000"} />
          <section className="rounded-xl border border-[#222a34] bg-[#0d1118] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#e1e7ec]"><ShieldCheck size={14} className="text-[#91a9bd]" />Pool checks</div>
            <div className="mt-3 flex justify-between text-[11px]"><span className="text-[#84909d]">Pool liquidity</span><span>{usd(token.liquidityUsd)}</span></div>
            <div className="mt-2 h-1 overflow-hidden rounded bg-[#202833]"><div className="h-full rounded bg-[#91a9bd]" style={{ width: `${Math.min(100, token.liquidityUsd / MIN_LIQUIDITY_USD * 100)}%` }} /></div>
            <p className="mt-2 text-[10px] leading-4 text-[#778492]">Paper trades require at least {usd(MIN_LIQUIDITY_USD)} pool liquidity. Verify the mint; names and logos can be copied.</p>
          </section>
          <Link href={`https://solscan.io/token/${encodeURIComponent(token.address)}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#202833] bg-[#0d1118] p-3 text-[11px] text-[#aab4c0] hover:text-white">Check mint on Solscan <ArrowUpRight size={13} /></Link>
        </aside>
      </div>
    </main>
  </>;
}
