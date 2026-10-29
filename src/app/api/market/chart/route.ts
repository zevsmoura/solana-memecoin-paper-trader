import { NextResponse } from "next/server";
import { z } from "zod";
import { getChart, type ChartTimeframe } from "@/lib/price-provider";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  pair: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1h"),
});

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`chart:${ip}`, 60, 60_000)) return NextResponse.json({ error: "Chart refresh limit reached." }, { status: 429 });
  const params = new URL(request.url).searchParams;
  const parsed = schema.safeParse({ address: params.get("address"), pair: params.get("pair") || undefined, timeframe: params.get("timeframe") ?? "1h" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid chart request." }, { status: 400 });
  try {
    const candles = await getChart(parsed.data.address, parsed.data.pair ?? "", parsed.data.timeframe as ChartTimeframe);
    return NextResponse.json({ candles }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chart data unavailable." }, { status: 502 });
  }
}
