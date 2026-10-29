import { db } from "@/lib/db";
import type { TokenMarket } from "@/lib/price-provider";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let lastPruneAt = 0;

function toMarket(row: {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: string;
  priceChange24h: number;
  priceChange1h?: number;
  priceChange6h?: number;
  buys24h: number;
  sells24h: number;
  liquidityUsd: number;
  volume24h: number;
  marketCap: string | null;
  pairAddress: string;
  dexId: string;
  pairCreatedAt: Date | null;
}): TokenMarket {
  return {
    address: row.address,
    name: row.name,
    symbol: row.symbol,
    imageUrl: row.imageUrl,
    priceUsd: row.priceUsd,
    priceChange24h: row.priceChange24h,
    priceChange1h: row.priceChange1h,
    priceChange6h: row.priceChange6h,
    buys24h: row.buys24h,
    sells24h: row.sells24h,
    liquidityUsd: row.liquidityUsd,
    volume24h: row.volume24h,
    marketCap: row.marketCap ? Number(row.marketCap) : null,
    pairAddress: row.pairAddress,
    dexId: row.dexId,
    pairCreatedAt: row.pairCreatedAt?.getTime() ?? null,
  };
}

/** Persist the live catalogue and a bounded history for fallback charts. */
export async function saveMarketData(markets: TokenMarket[]) {
  const minuteBucket = Math.floor(Date.now() / 60_000);
  await Promise.all(markets.map(async market => {
    const pairCreatedAt = market.pairCreatedAt && Number.isFinite(market.pairCreatedAt)
      ? new Date(market.pairCreatedAt)
      : null;
    await db.marketToken.upsert({
      where: { address: market.address },
      create: {
        address: market.address,
        name: market.name,
        symbol: market.symbol,
        imageUrl: market.imageUrl ?? null,
        pairAddress: market.pairAddress,
        dexId: market.dexId,
        priceUsd: market.priceUsd,
        priceChange24h: market.priceChange24h,
        buys24h: market.buys24h ?? 0,
        sells24h: market.sells24h ?? 0,
        priceChange1h: market.priceChange1h ?? 0,
        priceChange6h: market.priceChange6h ?? 0,
        liquidityUsd: market.liquidityUsd,
        volume24h: market.volume24h,
        marketCap: market.marketCap === null ? null : String(market.marketCap),
        pairCreatedAt,
      },
      update: {
        name: market.name,
        symbol: market.symbol,
        imageUrl: market.imageUrl ?? null,
        pairAddress: market.pairAddress,
        dexId: market.dexId,
        priceUsd: market.priceUsd,
        priceChange24h: market.priceChange24h,
        buys24h: market.buys24h ?? 0,
        sells24h: market.sells24h ?? 0,
        priceChange1h: market.priceChange1h ?? 0,
        priceChange6h: market.priceChange6h ?? 0,
        liquidityUsd: market.liquidityUsd,
        volume24h: market.volume24h,
        marketCap: market.marketCap === null ? null : String(market.marketCap),
        pairCreatedAt,
      },
    });

    const snapshot = {
      priceUsd: market.priceUsd,
      priceChange24h: market.priceChange24h,
      liquidityUsd: market.liquidityUsd,
      volume24h: market.volume24h,
      marketCap: market.marketCap === null ? null : String(market.marketCap),
    };
    await db.marketSnapshot.upsert({
      where: { tokenAddress_minuteBucket: { tokenAddress: market.address, minuteBucket } },
      create: {
        tokenAddress: market.address,
        minuteBucket,
        ...snapshot,
      },
      update: snapshot,
    });
  }));

  if (Date.now() - lastPruneAt > 60 * 60 * 1000) {
    lastPruneAt = Date.now();
    await db.marketSnapshot.deleteMany({ where: { capturedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } });
  }
}

export async function getStoredMarkets(query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  const exactMint = normalizedQuery && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalizedQuery);
  if (exactMint) {
    const row = await db.marketToken.findUnique({ where: { address: query!.trim() } });
    return row ? [toMarket(row)] : [];
  }
  const rows = await db.marketToken.findMany({
    where: { updatedAt: { gte: new Date(Date.now() - CACHE_MAX_AGE_MS) } },
    orderBy: [{ volume24h: "desc" }, { liquidityUsd: "desc" }],
    take: 3000,
  });
  return rows
    .map(toMarket)
    .filter(token => !normalizedQuery || [token.address, token.name, token.symbol].some(value => value.toLowerCase().includes(normalizedQuery)))
    .slice(0, 30);
}

export async function getStoredToken(address: string) {
  const row = await db.marketToken.findFirst({ where: { address, updatedAt: { gte: new Date(Date.now() - CACHE_MAX_AGE_MS) } } });
  return row ? toMarket(row) : null;
}

export async function getStoredChart(address: string) {
  const rows = await db.marketSnapshot.findMany({
    where: { tokenAddress: address },
    orderBy: { capturedAt: "desc" },
    take: 240,
    select: { capturedAt: true, priceUsd: true },
  });
  return rows.reverse().map(row => ({ time: Math.floor(row.capturedAt.getTime() / 1000), close: Number(row.priceUsd) }));
}
