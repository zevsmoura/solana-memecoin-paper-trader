/** Centralize live Solana market sources so providers can be swapped without
 * changing the rest of the app. */
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
  imageUrl?: string | null;
  priceChange1h?: number;
  priceChange6h?: number;
  buys24h?: number;
  sells24h?: number;
  pairCreatedAt?: number | null;
};

export type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  priceChange?: { h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};
type Profile = { chainId?: string; tokenAddress?: string; icon?: string };
type GeckoPool = { relationships?: { base_token?: { data?: { id?: string } } }; attributes?: { base_token_price_usd?: string } };
type GeckoPoolResponse = { data?: GeckoPool[] };

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
      imageUrl: safeImageUrl(best.info?.imageUrl),
      priceChange1h: best.priceChange?.h1 ?? 0,
      priceChange6h: best.priceChange?.h6 ?? 0,
      buys24h: best.txns?.h24?.buys ?? 0,
      sells24h: best.txns?.h24?.sells ?? 0,
      pairCreatedAt: best.pairCreatedAt ?? null,
    });
  }
  return tokens.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
}

function safeImageUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
  const sources = await Promise.allSettled([
    getJson<Profile[]>("https://api.dexscreener.com/token-profiles/latest/v1"),
    getJson<Profile[]>("https://api.dexscreener.com/token-boosts/latest/v1"),
    getJson<Profile[]>("https://api.dexscreener.com/token-boosts/top/v1"),
    getJson<GeckoPoolResponse>("https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1"),
    getJson<GeckoPoolResponse>("https://api.geckoterminal.com/api/v2/networks/solana/top_pools?page=1"),
  ]);
  const profiles = sources.slice(0, 3).flatMap(result => result.status === "fulfilled" ? result.value as Profile[] : []);
  const poolSources = sources.slice(3).flatMap(result => result.status === "fulfilled" ? (result.value as GeckoPoolResponse).data ?? [] : []);
  if (!profiles.length && !poolSources.length) throw new Error("Solana token discovery is temporarily unavailable.");
  const iconByAddress = new Map<string, string>();
  const profileAddresses = profiles.filter(item => item.chainId === "solana" && item.tokenAddress).map(item => {
    if (item.icon) iconByAddress.set(item.tokenAddress!.toLowerCase(), item.icon);
    return item.tokenAddress!;
  });
  const poolAddresses = poolSources.flatMap(pool => {
    const id = pool.relationships?.base_token?.data?.id;
    return id?.startsWith("solana_") ? [id.slice("solana_".length)] : [];
  });
  const addresses = [...new Set([...profileAddresses, ...poolAddresses])];
  if (!addresses.length) return [];
  const chunks = Array.from({ length: Math.ceil(addresses.length / 30) }, (_, index) => addresses.slice(index * 30, (index + 1) * 30));
  const pairResults = await Promise.allSettled(chunks.map(chunk =>
    getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${chunk.map(encodeURIComponent).join(",")}`),
  ));
  const pairs = pairResults.flatMap(result => result.status === "fulfilled" ? result.value : []);
  if (!pairs.length) throw new Error("Solana markets are temporarily unavailable.");
  const tokens = normalizePairs(pairs)
    .map(token => ({ ...token, imageUrl: token.imageUrl ?? safeImageUrl(iconByAddress.get(token.address.toLowerCase())) }))
    .sort((a, b) => b.volume24h - a.volume24h);
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
    // Symbol/name searches can include counterfeit lookalikes. Put the most
    // actively traded candidate first; the mint remains visible for verification.
    .sort((a, b) => {
      const queryLower = normalizedQuery.toLowerCase();
      const rank = (token: TokenMarket) => token.symbol.toLowerCase() === queryLower ? 0
        : token.name.toLowerCase() === queryLower ? 1
        : token.symbol.toLowerCase().startsWith(queryLower) || token.name.toLowerCase().startsWith(queryLower) ? 2
        : token.symbol.toLowerCase().includes(queryLower) || token.name.toLowerCase().includes(queryLower) ? 3 : 4;
      return rank(a) - rank(b) || b.volume24h - a.volume24h || b.liquidityUsd - a.liquidityUsd;
    })
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

export type ChartTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const chartIntervals: Record<ChartTimeframe, { endpoint: string; aggregate: number }> = {
  "1m": { endpoint: "minute", aggregate: 1 },
  "5m": { endpoint: "minute", aggregate: 5 },
  "15m": { endpoint: "minute", aggregate: 15 },
  "1h": { endpoint: "hour", aggregate: 1 },
  "4h": { endpoint: "hour", aggregate: 4 },
  "1d": { endpoint: "day", aggregate: 1 },
};

export async function getChart(address: string, pairAddress: string, timeframe: ChartTimeframe = "1h") {
  const interval = chartIntervals[timeframe];
  if (mockMode) {
    const seconds = interval.endpoint === "minute" ? interval.aggregate * 60 : interval.endpoint === "hour" ? interval.aggregate * 3600 : 86400;
    return Array.from({ length: 100 }, (_, i) => ({ time: Math.floor(Date.now() / 1000) - (99 - i) * seconds, open: .000009 + i * .00000002, high: .0000095 + i * .00000002, low: .0000085 + i * .00000002, close: .000009 + i * .00000002, volume: 10000 + i * 25 }));
  }
  const pool = pairAddress || address;
  let response: Response;
  try {
    response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/${interval.endpoint}?aggregate=${interval.aggregate}&limit=100&currency=usd`, { headers: { Accept: "application/json;version=20230203" }, next: { revalidate: timeframe === "1m" ? 15 : 45 }, signal: AbortSignal.timeout(8_000) });
  } catch {
    throw new Error("Price chart is temporarily unavailable.");
  }
  if (!response.ok) throw new Error("Price chart is temporarily unavailable.");
  const body = await response.json() as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  const candles = body.data?.attributes?.ohlcv_list ?? [];
  if (candles.length < 2) throw new Error("Not enough trading history to draw a chart yet.");
  return candles.reverse().map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
}
