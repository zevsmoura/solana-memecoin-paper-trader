import { NextResponse } from "next/server";
import { getDiscoveryTokens } from "@/lib/price-provider";
import { getStoredMarkets, saveMarketData } from "@/lib/market-store";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`discovery:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Market refresh limit reached. Try again shortly." }, { status: 429 });
  try {
    const tokens = await getDiscoveryTokens();
    await saveMarketData(tokens).catch(() => undefined);
    return NextResponse.json({ tokens, source: "live" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const tokens = await getStoredMarkets().catch(() => []);
    if (tokens.length) return NextResponse.json({ tokens, source: "snapshot" }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Market data unavailable." }, { status: 502 });
  }
}
