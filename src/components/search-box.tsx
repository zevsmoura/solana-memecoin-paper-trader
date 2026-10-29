"use client";
import { Search, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function SearchBox(){const [query,setQuery]=useState("");const router=useRouter();return <form onSubmit={e=>{e.preventDefault();if(query.trim())router.push(`/?q=${encodeURIComponent(query.trim())}`)}} className="flex items-center gap-3 rounded-2xl border border-[#293643] bg-[#0c1218] p-2 pl-4 shadow-2xl shadow-black/20"><Search size={18} className="shrink-0 text-[#8292a0]"/><input className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-[#61707e]" placeholder="Search by token, symbol or Solana address" value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn btn-primary !px-3 !py-2" aria-label="Search"><ArrowUpRight size={17}/></button></form>}
