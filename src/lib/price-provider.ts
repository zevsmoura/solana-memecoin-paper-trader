export type TokenMarket = { address: string; name: string; symbol: string; priceUsd: string; priceChange24h: number; liquidityUsd: number; volume24h: number; marketCap: number | null; pairAddress: string; dexId: string };
type Pair = { chainId?: string; dexId?: string; pairAddress?: string; baseToken?: { address?: string; name?: string; symbol?: string }; priceUsd?: string; priceChange?: { h24?: number }; liquidity?: { usd?: number }; volume?: { h24?: number }; marketCap?: number; fdv?: number; pairCreatedAt?: number };
const cache = new Map<string, { expires: number; data: TokenMarket[] }>();
const tokenCache = new Map<string, { expires: number; data: TokenMarket }>();
const TTL = 20_000;
const mockMode = process.env.NODE_ENV !== "production" && process.env.MARKET_DATA_MOCK === "true";
const demoToken: TokenMarket = { address: "DemoMint1111111111111111111111111111111111111", name: "Test Token", symbol: "TEST", priceUsd: "0.00001", priceChange24h: 4.25, liquidityUsd: 50000, volume24h: 23000, marketCap: 1000000, pairAddress: "DemoPool1111111111111111111111111111111111111", dexId: "Demo DEX" };
async function getJson(url: string) {
  let response: Response;
  try { response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 15 }, signal: AbortSignal.timeout(8_000) }); }
  catch { throw new Error("Market data is temporarily unavailable. Check your connection and try again."); }
  if (!response.ok) throw new Error(response.status === 429 ? "Market data is busy. Try again in a moment." : "Market data is temporarily unavailable.");
  return response.json();
}
function normalize(pairs: Pair[] = []): TokenMarket[] {
  return pairs.filter(p => p.chainId === "solana" && p.baseToken?.address && p.baseToken.symbol && p.priceUsd && Number(p.priceUsd) > 0)
    .map(p => ({ address: p.baseToken!.address!, name: p.baseToken!.name ?? p.baseToken!.symbol!, symbol: p.baseToken!.symbol!, priceUsd: p.priceUsd!, priceChange24h: p.priceChange?.h24 ?? 0, liquidityUsd: p.liquidity?.usd ?? 0, volume24h: p.volume?.h24 ?? 0, marketCap: p.marketCap ?? p.fdv ?? null, pairAddress: p.pairAddress ?? "", dexId: p.dexId ?? "DEX" }))
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd);
}
export async function searchTokens(query: string): Promise<TokenMarket[]> {
  if (mockMode) return [{ ...demoToken, symbol: query.toLowerCase().includes("bonk") ? "BONK" : demoToken.symbol }];
  const key = `search:${query.trim().toLowerCase()}`;
  const cached = cache.get(key); if (cached && cached.expires > Date.now()) return cached.data;
  const data = await getJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`) as { pairs?: Pair[] };
  const tokens = normalize(data.pairs).slice(0, 30); cache.set(key, { data: tokens, expires: Date.now() + TTL }); return tokens;
}
export async function getToken(address: string): Promise<TokenMarket> {
  if (mockMode) return { ...demoToken, address };
  const key = address.toLowerCase();
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  const tokens = await getJson(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`) as { pairs?: Pair[] };
  const token = normalize(tokens.pairs).find(item => item.address.toLowerCase() === address.toLowerCase());
  if (!token) throw new Error("No active Solana market found for that token.");
  tokenCache.set(key, { data: token, expires: Date.now() + TTL });
  return token;
}
export async function getSolUsd(): Promise<number> {
  if (mockMode) return 150;
  const token = await getToken("So11111111111111111111111111111111111111112"); return Number(token.priceUsd);
}
export async function getChart(address: string, pairAddress: string) {
  if (mockMode) return Array.from({length:48},(_,i)=>({time:Math.floor(Date.now()/1000)-(47-i)*14400,open:.000009+i*.00000002,high:.0000095+i*.00000002,low:.0000085+i*.00000002,close:.000009+i*.00000002,volume:10000+i*25}));
  const pool = pairAddress || address;
  let response: Response;
  try { response = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}/ohlcv/hour?aggregate=4&limit=48&currency=usd`, { headers: { Accept: "application/json;version=20230203" }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8_000) }); }
  catch { throw new Error("Price chart is temporarily unavailable."); }
  if (!response.ok) throw new Error("Price chart is temporarily unavailable.");
  const body = await response.json() as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  const candles = body.data?.attributes?.ohlcv_list ?? [];
  if (candles.length < 2) throw new Error("Not enough trading history to draw a chart yet.");
  return candles.reverse().map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
}
