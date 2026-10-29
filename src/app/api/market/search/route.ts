import { NextResponse } from "next/server";
import { z } from "zod";
import { searchTokens } from "@/lib/price-provider";
import { getStoredMarkets, saveMarketData } from "@/lib/market-store";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(req:Request){const ip=req.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";if(!rateLimit(`search:${ip}`,40,60_000))return NextResponse.json({error:"Search limit reached. Try again shortly."},{status:429});const query=new URL(req.url).searchParams.get("q")??"";const parsed=z.string().trim().min(1).max(80).safeParse(query);if(!parsed.success)return NextResponse.json({error:"Enter a token name, symbol, or address."},{status:400});try{const tokens=await searchTokens(parsed.data);await saveMarketData(tokens).catch(()=>undefined);return NextResponse.json({tokens,source:"live"})}catch(e){const tokens=await getStoredMarkets(parsed.data).catch(()=>[]);if(tokens.length)return NextResponse.json({tokens,source:"snapshot"});return NextResponse.json({error:e instanceof Error?e.message:"Market data unavailable."},{status:502})}}
