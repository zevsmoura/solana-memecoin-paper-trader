"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, LoaderCircle, Zap } from "lucide-react";

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

export function TradePanel({
  address,
  symbol,
  price,
  solPrice,
  loggedIn,
  marketLive = true,
  holdingQuantity = "0",
  balanceSol = "10.0000",
}: {
  address: string;
  symbol: string;
  price: number;
  solPrice: number;
  loggedIn: boolean;
  marketLive?: boolean;
  holdingQuantity?: string;
  balanceSol?: string;
}) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const estimate = useMemo(() => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0 || price <= 0) return "—";
    return side === "BUY"
      ? tokenAmount(numeric * solPrice / price / 1.01)
      : `${(numeric * price / solPrice * .985).toFixed(4)} SOL`;
  }, [amount, price, side, solPrice]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, tokenAddress: address, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Trade failed.");
      setMessage(`${side} filled · ${tokenAmount(Number(data.quantity))} ${symbol}`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Trade failed.");
    } finally {
      setBusy(false);
    }
  }

  const presets = side === "BUY"
    ? ["0.1", "0.25", "0.5", "1"]
    : [25, 50, 75, 100].map(percent => ({ label: `${percent}%`, amount: proportionalAmount(holdingQuantity, percent) }));

  return <section className="overflow-hidden rounded-xl border border-[#293542] bg-[#0d1219] shadow-[0_16px_50px_rgba(0,0,0,.22)]">
    <div className="flex items-center justify-between border-b border-[#26313d] px-4 py-3.5">
      <div><h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#e5ebf0]"><Zap size={14} className="text-[#a9bdce]" /> Instant trade</h2><p className="mt-1 text-[10px] text-[#7e8a98]">Simulated execution · no wallet</p></div>
      <span className="rounded border border-[#344351] bg-[#151e28] px-2 py-1 font-mono text-[10px] text-[#b3c2ce]">{balanceSol} SOL</span>
    </div>
    <div className="p-4">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[#242d38] bg-[#090d12] p-1">
        <button type="button" onClick={() => { setSide("BUY"); setAmount("0.1"); setMessage(""); }} className={`rounded-md py-2.5 text-xs font-semibold transition ${side === "BUY" ? "bg-[#31485c] text-[#e3edf5] shadow-inner" : "text-[#8995a2] hover:text-white"}`}>Buy ${symbol}</button>
        <button type="button" onClick={() => { setSide("SELL"); setAmount(holdingQuantity); setMessage(""); }} className={`rounded-md py-2.5 text-xs font-semibold transition ${side === "SELL" ? "bg-[#50323a] text-[#f1dce0] shadow-inner" : "text-[#8995a2] hover:text-white"}`}>Sell ${symbol}</button>
      </div>

      <div className="mb-1.5 flex items-center justify-between text-[10px] text-[#818d9a]"><label htmlFor="instant-trade-amount">{side === "BUY" ? "You pay" : "You sell"}</label><span>Balance: {side === "BUY" ? `${balanceSol} SOL` : `${tokenAmount(Number(holdingQuantity))} ${symbol}`}</span></div>
      <div className="relative">
        <input id="instant-trade-amount" className="field !rounded-lg !border-[#2b3744] !bg-[#090d12] !py-3 pr-16 font-mono text-sm" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" />
        <span className="absolute right-3 top-3.5 text-[10px] font-semibold text-[#9eabb7]">{side === "BUY" ? "SOL" : symbol}</span>
      </div>

      <div className="my-2.5 flex gap-1.5">
        {presets.map(preset => {
          const label = typeof preset === "string" ? preset : preset.label;
          const value = typeof preset === "string" ? preset : preset.amount;
          return <button key={label} type="button" onClick={() => setAmount(value)} disabled={side === "SELL" && Number(value) <= 0} className="flex-1 rounded-md border border-[#26313c] bg-[#141a22] py-2 text-[10px] text-[#adb7c0] transition hover:border-[#647587] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{label}</button>;
        })}
      </div>

      <div className="mb-3 rounded-lg border border-[#202a35] bg-[#10161e] p-3">
        <p className="text-[9px] uppercase tracking-[.13em] text-[#748190]">Estimated receive</p>
        <p className="mt-1.5 truncate font-mono text-base font-semibold text-[#dbe4eb]">{estimate} <span className="text-xs font-medium text-[#929eaa]">{side === "BUY" ? symbol : ""}</span></p>
      </div>

      <div className="mb-4 space-y-1.5 text-[10px] text-[#7e8a98]"><div className="flex justify-between"><span>Market price</span><span className="font-mono">${price < .01 ? price.toPrecision(5) : price.toFixed(4)}</span></div><div className="flex justify-between"><span>Slippage / fee</span><span>1.0% / 0.5%</span></div></div>

      {!marketLive ? <div className="rounded-md border border-[#58472f] bg-[#211b14] p-2.5 text-center text-[10px] text-[#d4bd91]">Live quote unavailable. Trading is paused.</div> : loggedIn ? <form onSubmit={submit}><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md border border-[#60788b] bg-[#344b5f] py-3 text-xs font-bold text-[#e7eff5] transition hover:bg-[#405a70] disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={15} /> : <ArrowDownUp size={14} />}{busy ? "Submitting…" : `Confirm ${side.toLowerCase()}`}</button></form> : <a href="/login" className="flex w-full items-center justify-center rounded-md border border-[#60788b] bg-[#344b5f] py-3 text-xs font-bold text-[#e7eff5] hover:bg-[#405a70]">Log in to paper trade</a>}
      {message && <p className="mt-3 text-center text-[10px] text-[#c7b28b]">{message}</p>}
      <p className="mt-3 text-center text-[9px] text-[#697685]">Paper trading only · No real funds</p>
    </div>
  </section>;
}
