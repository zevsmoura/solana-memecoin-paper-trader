import { MIN_LIQUIDITY_USD } from "@/lib/config";

/** DexScreener is the only market-data integration. Keep its API details here so
 * another provider can replace it without changing the rest of the app. */
export type TokenMarket = {
  address: string;
  name: string;
  symbol: string;
  priceUsd: string;
  priceChange24h: number;
  liquidityUsd: number;
  volume24h: number;
  marketCap: number | null;
  pairAddress: string;
  dexId: string;
};

export type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  marketCap?: number;
  fdv?: number;
};
type Profile = { chainId?: string; tokenAddress?: string };

const TTL = 20_000;
const cache = new Map<string, { expires: number; data: TokenMarket[] }>();
const tokenCache = new Map<string, { expires: number; data: TokenMarket }>();
const mockMode = process.env.NODE_ENV !== "production" && process.env.MARKET_DATA_MOCK === "true";
const demoToken: TokenMarket = { address: "DemoMint1111111111111111111111111111111111111", name: "Test Token", symbol: "TEST", priceUsd: "0.00001", priceChange24h: 4.25, liquidityUsd: 50000, volume24h: 23000, marketCap: 1000000, pairAddress: "DemoPool1111111111111111111111111111111111111", dexId: "Demo DEX" };

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 15 }, signal: AbortSignal.timeout(8_000) });
  } catch {
    throw new Error("Market data is temporarily unavailable. Check your connection and try again.");
  }
  if (!response.ok) throw new Error(response.status === 429 ? "Market data is busy. Try again in a moment." : "Market data is temporarily unavailable.");
  return response.json() as Promise<T>;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Collapse DexScreener's many pools into one row per mint, and ignore isolated
 * pool prices that are far away from the token's other active markets. */
export function normalizePairs(pairs: DexPair[] = [], minLiquidity = 0): TokenMarket[] {
  const groups = new Map<string, DexPair[]>();
  for (const pair of pairs) {
    const address = pair.baseToken?.address;
    const price = Number(pair.priceUsd);
    if (pair.chainId !== "solana" || !address || !pair.baseToken?.symbol || !Number.isFinite(price) || price <= 0) continue;
    const group = groups.get(address.toLowerCase()) ?? [];
    group.push(pair);
    groups.set(address.toLowerCase(), group);
  }

  const tokens: TokenMarket[] = [];
  for (const group of groups.values()) {
    const liquid = group.filter(pair => Number(pair.liquidity?.usd ?? 0) >= minLiquidity);
    if (minLiquidity > 0 && liquid.length === 0) continue;
    const candidates = minLiquidity > 0 ? liquid : group;
    const referencePrice = median(candidates.map(pair => Number(pair.priceUsd)));
    const consistent = candidates.filter(pair => {
      const ratio = Number(pair.priceUsd) / referencePrice;
      return ratio >= 1 / 3 && ratio <= 3;
    });
    const best = (consistent.length ? consistent : candidates).sort((a, b) =>
      Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0) || Number(b.volume?.h24 ?? 0) - Number(a.volume?.h24 ?? 0),
    )[0];
    if (!best?.baseToken?.address || !best.priceUsd) continue;
    tokens.push({
      address: best.baseToken.address,
      name: best.baseToken.name ?? best.baseToken.symbol ?? "Unknown token",
      symbol: best.baseToken.symbol ?? "?",
      priceUsd: best.priceUsd,
      priceChange24h: best.priceChange?.h24 ?? 0,
      liquidityUsd: Number(best.liquidity?.usd ?? 0),
      volume24h: Number(best.volume?.h24 ?? 0),
      marketCap: best.marketCap ?? best.fdv ?? null,
      pairAddress: best.pairAddress ?? "",
      dexId: best.dexId ?? "DEX",
    });
  }
  return tokens.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
}

function memo<T>(map: Map<string, { expires: number; data: T }>, key: string) {
  const hit = map.get(key);
  return hit && hit.expires > Date.now() ? hit.data : undefined;
}

/** Recent Solana token profiles provide the default discovery feed (rather than
 * searching the word "solana", which only returns pools for wrapped SOL). */
export async function getDiscoveryTokens(): Promise<TokenMarket[]> {
  if (mockMode) return [demoToken];
  const key = "discovery:solana";
  const cached = memo(cache, key);
  if (cached) return cached;
  const profiles = await getJson<Profile[]>("https://api.dexscreener.com/token-profiles/latest/v1");
  const addresses = [...new Set(profiles.filter(item => item.chainId === "solana" && item.tokenAddress).map(item => item.tokenAddress!))].slice(0, 30);
  if (!addresses.length) return [];
  const pairs = await getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${addresses.map(encodeURIComponent).join(",")}`);
  const tokens = normalizePairs(pairs, MIN_LIQUIDITY_USD)
    .filter(token => token.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 30);
  cache.set(key, { data: tokens, expires: Date.now() + TTL });
  return tokens;
}

export async function searchTokens(query: string): Promise<TokenMarket[]> {
  if (mockMode) return [{ ...demoToken, symbol: query.toLowerCase().includes("bonk") ? "BONK" : demoToken.symbol }];
  const normalizedQuery = query.trim();
  const key = `search:${normalizedQuery.toLowerCase()}`;
  const cached = memo(cache, key);
  if (cached) return cached;
  const exactAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalizedQuery);
  const url = exactAddress
    ? `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(normalizedQuery)}`
    : `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(normalizedQuery)}`;
  const response = exactAddress ? await getJson<DexPair[]>(url) : await getJson<{ pairs?: DexPair[] }>(url).then(result => result.pairs ?? []);
  const tokens = normalizePairs(response)
    .filter(token => !exactAddress || token.address.toLowerCase() === normalizedQuery.toLowerCase())
    .slice(0, 30);
  cache.set(key, { data: tokens, expires: Date.now() + TTL });
  return tokens;
}

export async function getToken(address: string): Promise<TokenMarket> {
  if (mockMode) return { ...demoToken, address };
  const key = address.toLowerCase();
  const cached = memo(tokenCache, key);
  if (cached) return cached;
  const pairs = await getJson<DexPair[]>(`https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(address)}`);
  const token = normalizePairs(pairs).find(item => item.address.toLowerCase() === key);
  if (!token) throw new Error("No active Solana market found for that token.");
  tokenCache.set(key, { data: token, expires: Date.now() + TTL });
  return token;
}

export async function getSolUsd(): Promise<number> {
  if (mockMode) return 150;
  const token = await getToken("So11111111111111111111111111111111111111112");
  return Number(token.priceUsd);
}

export async function getChart(address: string, pairAddress: string) {
  if (mockMode) return Array.from({ length: 48 }, (_, i) => ({ time: Math.floor(Date.now() / 1000) - (47 - i) * 14400, open: .000009 + i * .00000002, high: .0000095 + i * .00000002, low: .0000085 + i * .00000002, close: .000009 + i * .00000002, volume: 10000 + i * 25 }));
  const pool = pairAddress || address;
  let response: Response;
  try {
    response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/hour?aggregate=4&limit=48&currency=usd`, { headers: { Accept: "application/json;version=20230203" }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8_000) });
  } catch {
    throw new Error("Price chart is temporarily unavailable.");
  }
  if (!response.ok) throw new Error("Price chart is temporarily unavailable.");
  const body = await response.json() as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  const candles = body.data?.attributes?.ohlcv_list ?? [];
  if (candles.length < 2) throw new Error("Not enough trading history to draw a chart yet.");
  return candles.reverse().map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
}
