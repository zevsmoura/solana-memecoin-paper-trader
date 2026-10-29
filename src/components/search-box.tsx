"use client";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function SearchBox({ initialQuery = "" }: { initialQuery?: string }){const [query,setQuery]=useState(initialQuery);const router=useRouter();return <form onSubmit={e=>{e.preventDefault();if(query.trim())router.push(`/?q=${encodeURIComponent(query.trim())}`)}} className="flex items-center gap-2 rounded-lg border border-[#27313c] bg-[#0c1016] p-1.5 pl-3"><Search size={15} className="shrink-0 text-[#8292a0]"/><input className="min-w-0 flex-1 bg-transparent py-1.5 text-xs outline-none placeholder:text-[#61707e]" placeholder="Token name, ticker, or Solana mint" value={query} onChange={e=>setQuery(e.target.value)}/><button className="rounded-md bg-[#a9f05e] px-3 py-2 text-[10px] font-bold text-[#11180b] hover:bg-[#c0fa7f]" aria-label="Search">Search</button></form>}
