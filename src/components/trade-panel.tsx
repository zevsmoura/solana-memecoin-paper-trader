"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, LoaderCircle, Settings2, Zap } from "lucide-react";

type Side = "BUY" | "SELL";
const DEFAULT_BUY = ["0.1", "0.25", "0.5", "1"];
const DEFAULT_SELL = [25, 50, 75, 100];

function proportionalAmount(quantity: string, percent: number) {
  const [whole, fraction = ""] = quantity.split(".");
  const scale = 10n ** BigInt(fraction.length);
  const units = BigInt(whole || "0") * scale + BigInt(fraction || "0");
  const part = units * BigInt(percent) / 100n;
  const resultWhole = part / scale;
  const resultFraction = (part % scale).toString().padStart(fraction.length, "0").replace(/0+$/, "");
  return resultFraction ? `${resultWhole}.${resultFraction}` : resultWhole.toString();
}

function tokenAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 6 }).format(value);
}

export function TradePanel({ address, symbol, price, solPrice, loggedIn, marketLive = true, holdingQuantity = "0", balanceSol = "10.0000" }: {
  address: string; symbol: string; price: number; solPrice: number; loggedIn: boolean; marketLive?: boolean; holdingQuantity?: string; balanceSol?: string;
}) {
  const [side, setSide] = useState<Side>("BUY");
  const [buySizes, setBuySizes] = useState(DEFAULT_BUY);
  const [sellSizes, setSellSizes] = useState(DEFAULT_SELL);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("memeport:instant-trade-presets");
      if (saved) {
        const parsed = JSON.parse(saved) as { buy?: string[]; sell?: number[] };
        if (parsed.buy?.length === 4) setBuySizes(parsed.buy);
        if (parsed.sell?.length === 4) setSellSizes(parsed.sell);
      }
    } catch { /* Defaults remain available if browser storage is disabled. */ }
  }, []);

  function savePresets(nextBuy = buySizes, nextSell = sellSizes) {
    setBuySizes(nextBuy); setSellSizes(nextSell);
    try { localStorage.setItem("memeport:instant-trade-presets", JSON.stringify({ buy: nextBuy, sell: nextSell })); } catch { /* The current session still uses the edited sizes. */ }
  }

  const estimates = useMemo(() => buySizes.map(value => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 && price > 0 ? tokenAmount(amount * solPrice / price / 1.015) : "—";
  }), [buySizes, price, solPrice]);

  async function execute(tradeSide: Side, amount: string) {
    if (!loggedIn || busy || !marketLive || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return;
    setSide(tradeSide); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/trade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side: tradeSide, tokenAddress: address, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Trade failed.");
      setMessage(`${tradeSide === "BUY" ? "Bought" : "Sold"} ${tokenAmount(Number(data.quantity))} ${symbol}`);
      window.setTimeout(() => router.refresh(), 650);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trade failed.");
    } finally { setBusy(false); }
  }

  const holding = Number(holdingQuantity);

  return <section className="overflow-hidden rounded-xl border border-[#293542] bg-[#0d1219] shadow-[0_16px_50px_rgba(0,0,0,.22)]">
    <div className="flex items-center justify-between border-b border-[#26313d] px-4 py-3.5">
      <div><h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#e5ebf0]"><Zap size={14} className="text-[#a9bdce]" /> Instant trade</h2><p className="mt-1 text-[10px] text-[#7e8a98]">One click · simulated · no wallet</p></div>
      <div className="text-right"><span className="block rounded border border-[#344351] bg-[#151e28] px-2 py-1 font-mono text-[10px] text-[#b3c2ce]">{side === "BUY" ? balanceSol : tokenAmount(holding)} {side === "BUY" ? "SOL" : symbol}</span><button type="button" onClick={() => setEditing(value => !value)} className="mt-1 inline-flex items-center gap-1 text-[9px] text-[#8b9bab] hover:text-white"><Settings2 size={10} />{editing ? "Done" : "Edit buttons"}</button></div>
    </div>
    <div className="p-4">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[#242d38] bg-[#090d12] p-1">
        {(["BUY", "SELL"] as const).map(item => <button key={item} type="button" onClick={() => { setSide(item); setMessage(""); }} className={`rounded-md py-2.5 text-xs font-semibold transition ${side === item ? item === "BUY" ? "bg-[#31485c] text-[#e3edf5] shadow-inner" : "bg-[#50323a] text-[#f1dce0] shadow-inner" : "text-[#8995a2] hover:text-white"}`}>{item === "BUY" ? `Buy $${symbol}` : `Sell $${symbol}`}</button>)}
      </div>

      {editing && <div className="mb-3 rounded-lg border border-[#28333f] bg-[#10161e] p-3"><p className="mb-2 text-[10px] font-semibold text-[#c0ccd7]">{side === "BUY" ? "Buy presets · SOL" : "Sell presets · % held"}</p><div className="grid grid-cols-4 gap-2">{(side === "BUY" ? buySizes : sellSizes.map(String)).map((value, index) => <input key={`${side}-${index}`} aria-label={`${side.toLowerCase()} preset ${index + 1}`} className="w-full rounded border border-[#303c49] bg-[#090d12] px-1.5 py-2 text-center font-mono text-[10px] text-white outline-none focus:border-[#71889c]" type="number" min={side === "BUY" ? "0.001" : "1"} max={side === "BUY" ? "100" : "100"} step={side === "BUY" ? "0.05" : "1"} value={value} onChange={event => {
        if (side === "BUY") { const next = [...buySizes]; next[index] = event.target.value; savePresets(next, sellSizes); }
        else { const next = [...sellSizes]; next[index] = Number(event.target.value); savePresets(buySizes, next); }
      }} />)}</div><p className="mt-2 text-[9px] text-[#788796]">Changes save in this browser. Clicking a preset executes instantly.</p></div>}

      {!editing && side === "BUY" ? <div className="grid grid-cols-2 gap-2">{buySizes.map((size, index) => <button key={`buy-${index}`} type="button" onClick={() => execute("BUY", size)} disabled={!marketLive || !loggedIn || busy || Number(size) <= 0 || Number(size) > Number(balanceSol)} className="rounded-lg border border-[#344757] bg-[#16222d] px-3 py-3 text-left transition hover:border-[#8299ac] hover:bg-[#1d2d3b] disabled:cursor-not-allowed disabled:opacity-45"><span className="flex items-center justify-between text-xs font-semibold text-[#d9e5ee]">{busy && side === "BUY" ? <LoaderCircle size={13} className="animate-spin" /> : <><span>Buy {size} SOL</span><ArrowDownUp size={12} /></>}</span><span className="mt-1 block truncate font-mono text-[9px] text-[#8797a7]">≈ {estimates[index]} {symbol}</span></button>)}</div> : null}

      {!editing && side === "SELL" ? <div className="grid grid-cols-2 gap-2">{sellSizes.map((percent, index) => { const amount = proportionalAmount(holdingQuantity, Math.min(100, Math.max(0, percent))); return <button key={`sell-${index}`} type="button" onClick={() => execute("SELL", amount)} disabled={!marketLive || !loggedIn || busy || holding <= 0 || amount === "0" || percent <= 0 || percent > 100} className="rounded-lg border border-[#51353d] bg-[#24171b] px-3 py-3 text-left transition hover:border-[#a36f79] hover:bg-[#302025] disabled:cursor-not-allowed disabled:opacity-45"><span className="flex items-center justify-between text-xs font-semibold text-[#eddce0]">{busy && side === "SELL" ? <LoaderCircle size={13} className="animate-spin" /> : <><span>Sell {percent}%</span><ArrowDownUp size={12} /></>}</span><span className="mt-1 block truncate font-mono text-[9px] text-[#aa8d93]">{tokenAmount(Number(amount))} {symbol}</span></button>; })}</div> : null}

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#7e8a98]"><span>Market price</span><span className="font-mono">${price < .01 ? price.toPrecision(5) : price.toFixed(4)}</span></div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[#7e8a98]"><span>Slippage / fee</span><span>1.0% / 0.5%</span></div>
      {!marketLive ? <div className="mt-3 rounded-md border border-[#58472f] bg-[#211b14] p-2.5 text-center text-[10px] text-[#d4bd91]">Live quote unavailable. Trading is paused.</div> : !loggedIn ? <a href="/login" className="mt-3 flex w-full items-center justify-center rounded-md border border-[#60788b] bg-[#344b5f] py-3 text-xs font-bold text-[#e7eff5] hover:bg-[#405a70]">Log in to paper trade</a> : null}
      {message && <p role="status" className="mt-3 text-center text-[10px] text-[#c7b28b]">{message}</p>}
      <p className="mt-3 text-center text-[9px] text-[#697685]">Paper trading only · No real funds</p>
    </div>
  </section>;
}
