import Link from "next/link";
import { Activity, ArrowUpRight, Flame, LineChart, ShieldCheck, Wallet } from "lucide-react";
import { Header } from "@/components/header";
import { SearchBox } from "@/components/search-box";
import { TokenTable } from "@/components/token-table";
import { getDiscoveryTokens, searchTokens, type TokenMarket } from "@/lib/price-provider";
import { currentUser } from "@/lib/auth";
import { formatSol, usd } from "@/lib/money";
import { getStoredMarkets, saveMarketData } from "@/lib/market-store";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const user = await currentUser();
  let tokens: TokenMarket[] = [];
  let marketError = "";
  let usingSnapshot = false;

  try {
    tokens = query ? await searchTokens(query) : await getDiscoveryTokens();
  } catch (error) {
    tokens = await getStoredMarkets(query).catch(() => []);
    usingSnapshot = tokens.length > 0;
    if (!usingSnapshot) marketError = error instanceof Error ? error.message : "Market data is temporarily unavailable.";
  }
  if (!usingSnapshot && tokens.length) await saveMarketData(tokens).catch(() => undefined);

  const totalVolume = tokens.reduce((sum, token) => sum + token.volume24h, 0);
  const highestLiquidity = tokens.reduce((max, token) => Math.max(max, token.liquidityUsd), 0);

  return <>
    <Header />
    <main className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 md:px-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#8fa0ae]"><span className="h-1.5 w-1.5 rounded-full bg-[#a9f05e]" /> Solana terminal <span className="text-[#556171]">/</span> Markets</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#eef1f5] md:text-3xl">Explore tokens</h1>
          <p className="mt-1 text-xs text-[#8793a1]">Discover on-chain Solana pairs and practice trades with virtual SOL.</p>
        </div>
        <div className="w-full md:w-[min(100%,420px)]"><SearchBox initialQuery={query} /></div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { label: "Network", value: "Solana", icon: Activity },
          { label: "Markets shown", value: String(tokens.length), icon: Flame },
          { label: "Combined 24h volume", value: usd(totalVolume), icon: LineChart },
          { label: "Deepest liquidity", value: usd(highestLiquidity), icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-[#202833] bg-[#0d1118] px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#778393]"><Icon size={12} />{label}</div>
          <strong className="mt-1 block text-sm font-semibold text-[#d9e0e7]">{value}</strong>
        </div>)}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[210px_minmax(0,1fr)_240px]">
        <aside className="hidden space-y-3 xl:block">
          <section className="rounded-xl border border-[#202833] bg-[#0d1118] p-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6e7a89]">Discover</p>
            <Link href="/" className="flex items-center gap-2 rounded-md bg-[#1b242d] px-2.5 py-2 text-xs font-medium text-white"><Flame size={14} className="text-[#b7f568]" /> Trending Solana</Link>
            <p className="px-2 pt-3 text-[10px] leading-4 text-[#74808e]">Feed combines newly profiled and promoted Solana tokens. Ranked by real market activity.</p>
          </section>
          <section className="rounded-xl border border-[#202833] bg-[#0d1118] p-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6e7a89]">Quick search</p>
            {["BONK", "WIF", "POPCAT", "FARTCOIN", "PUMP"].map(symbol => <Link key={symbol} href={`/?q=${symbol}`} className="flex items-center justify-between rounded-md px-2.5 py-2 text-xs text-[#aab4bf] hover:bg-[#171e27] hover:text-white"><span>{symbol}</span><ArrowUpRight size={12} className="text-[#647180]" /></Link>)}
          </section>
          <div className="rounded-xl border border-[#29372d] bg-[#101a14] p-3 text-[11px] leading-5 text-[#96a99b]"><ShieldCheck size={15} className="mb-1 text-[#a9f05e]" />Simulation only. No wallet connection, real money, or on-chain trades.</div>
        </aside>

        <section className="min-w-0">
          {marketError && <p className="mb-3 rounded-lg border border-[#624b2d] bg-[#251d12] p-3 text-xs text-[#f1cb82]">{marketError}</p>}
          {usingSnapshot && <p className="mb-3 rounded-lg border border-[#624b2d] bg-[#251d12] p-3 text-xs text-[#f1cb82]">Live quotes are unavailable. Showing the latest saved market snapshot; trading is still validated against live prices.</p>}
          <TokenTable tokens={tokens} query={query} />
          <p className="mt-2 px-1 text-[10px] leading-4 text-[#677483]">Names and symbols can be impersonated. Confirm the full mint address before trading. Market feed: DexScreener.</p>
        </section>

        <aside className="space-y-3">
          <section className="rounded-xl border border-[#29372d] bg-[#101a14] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#dfe8e1]"><Wallet size={15} className="text-[#a9f05e]" /> Paper wallet</div>
            <p className="mt-4 text-[10px] uppercase tracking-[.12em] text-[#798a7f]">Available balance</p>
            <strong className="mt-1 block text-2xl font-semibold text-[#b9f575]">{user ? formatSol(user.balance) : "10.0000"} <span className="text-sm">SOL</span></strong>
            <p className="mt-2 text-[10px] leading-4 text-[#84948a]">{user ? `Signed in as ${user.username}` : "Starting balance · virtual funds only"}</p>
            <Link href={user ? "/portfolio" : "/signup"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#a9f05e] px-3 py-2.5 text-xs font-bold text-[#11180b] hover:bg-[#c0fa7f]">{user ? "Open portfolio" : "Create free account"}<ArrowUpRight size={14} /></Link>
          </section>
          <section className="rounded-xl border border-[#202833] bg-[#0d1118] p-4">
            <p className="text-xs font-semibold text-[#dfe5eb]">Market filters</p>
            <p className="mt-2 text-[11px] leading-5 text-[#82909e]">Browse trending, new pairs, volume leaders, and gainers. Token metadata and snapshots are saved to the app database.</p>
            <Link href="/leaderboard" className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#b6f266] hover:text-white">Paper trader leaderboard <ArrowUpRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </main>
  </>;
}
