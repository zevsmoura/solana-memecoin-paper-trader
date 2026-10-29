"use client";

import { Search, ArrowUpRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TokenMarket } from "@/lib/price-provider";
import { TokenImage } from "@/components/token-image";

export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<TokenMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const cache = useRef(new Map<string, TokenMarket[]>());

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2 || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalized)) { setSuggestions([]); setLoading(false); return; }
    const cached = cache.current.get(normalized.toLowerCase());
    if (cached) { setSuggestions(cached); setOpen(true); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/market/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Search unavailable.");
        const tokens = (data.tokens ?? []) as TokenMarket[];
        cache.current.set(normalized.toLowerCase(), tokens);
        setSuggestions(tokens); setActive(0); setOpen(true);
      } catch { if (!controller.signal.aborted) setSuggestions([]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 240);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function openToken(token: TokenMarket) { setOpen(false); router.push(`/token/${token.address}`); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (open && suggestions[active]) { openToken(suggestions[active]); return; }
    if (query.trim()) { setOpen(false); router.push(`/?q=${encodeURIComponent(query.trim())}`); }
  }

  return <form onSubmit={submit} className="relative flex items-center gap-2 rounded-lg border border-[#27313c] bg-[#0c1016] p-1.5 pl-3">
    <Search size={15} className="shrink-0 text-[#8292a0]" />
    <input className="min-w-0 flex-1 bg-transparent py-1.5 text-xs outline-none placeholder:text-[#61707e]" placeholder="Token name, ticker, or Solana mint" value={query} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
      if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setOpen(true); setActive(index => (index + 1) % suggestions.length); }
      if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActive(index => (index - 1 + suggestions.length) % suggestions.length); }
      if (event.key === "Escape") setOpen(false);
    }} role="combobox" aria-expanded={open && suggestions.length > 0} aria-controls="token-search-suggestions" aria-autocomplete="list" />
    {loading && <LoaderCircle size={14} className="animate-spin text-[#8c9bab]" />}
    <button className="rounded-md bg-[#91a9bd] px-3 py-2 text-[10px] font-bold text-[#11180b] hover:bg-[#adc1d1]" aria-label="Search">Search</button>
    {open && (suggestions.length > 0 || (query.trim().length >= 2 && loading)) && <ul id="token-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-[#303d4a] bg-[#10161e] py-1 shadow-2xl">
      {suggestions.slice(0, 8).map((token, index) => <li key={token.address} role="option" aria-selected={active === index}><button type="button" onMouseDown={event => event.preventDefault()} onClick={() => openToken(token)} className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${index === active ? "bg-[#1b2835]" : "hover:bg-[#18212b]"}`}>
        <TokenImage src={token.imageUrl} symbol={token.symbol} size={30} />
        <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#e4eaf0]">{token.name} <span className="font-normal text-[#91a0af]">${token.symbol}</span></strong><span className="block truncate font-mono text-[9px] text-[#718091]">{token.address}</span></span>
        <ArrowUpRight size={13} className="shrink-0 text-[#7d91a3]" />
      </button></li>)}
      {suggestions.length > 8 && <li className="px-3 py-2 text-[10px] text-[#8291a0]">Type more to narrow results · {suggestions.length} matches</li>}
    </ul>}
  </form>;
}
