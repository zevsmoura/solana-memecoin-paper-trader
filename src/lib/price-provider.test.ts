import { describe, expect, it } from "vitest";
import { normalizePairs, type DexPair } from "@/lib/price-provider";

const pool = (pairAddress: string, priceUsd: string, liquidity: number): DexPair => ({
  chainId: "solana",
  dexId: "Raydium",
  pairAddress,
  baseToken: { address: "Mint111111111111111111111111111111111111111", name: "Dog Coin", symbol: "DOG" },
  priceUsd,
  priceChange: { h24: 2 },
  liquidity: { usd: liquidity },
  volume: { h24: 1000 },
});

describe("normalizePairs", () => {
  it("returns one market per Solana mint and picks the deepest consistent pool", () => {
    const markets = normalizePairs([
      pool("small", "1", 12_000),
      pool("deep", "1.01", 80_000),
      pool("bad-outlier", "500", 100_000),
      { ...pool("wrong-chain", "1", 500_000), chainId: "ethereum" },
    ]);

    expect(markets).toHaveLength(1);
    expect(markets[0].pairAddress).toBe("deep");
    expect(markets[0].priceUsd).toBe("1.01");
  });

  it("can exclude pools below the configured liquidity floor", () => {
    expect(normalizePairs([pool("thin", "1", 900)], 10_000)).toEqual([]);
  });

  it("keeps distinct mints with the same ticker separate", () => {
    const second = pool("second", "2", 20_000);
    second.baseToken = { address: "Mint222222222222222222222222222222222222222", name: "Dog Coin Copy", symbol: "DOG" };
    expect(normalizePairs([pool("first", "1", 20_000), second])).toHaveLength(2);
  });

  it("normalizes chart, icon, and short interval market metadata", () => {
    const market = normalizePairs([{
      ...pool("metadata", "0.25", 20_000),
      info: { imageUrl: "https://cdn.example.test/dog.png" },
      priceChange: { h1: 1.2, h6: -3.4, h24: 8.9 },
      txns: { h24: { buys: 15, sells: 8 } },
      pairCreatedAt: 1_700_000_000_000,
    }])[0];

    expect(market).toMatchObject({
      imageUrl: "https://cdn.example.test/dog.png",
      priceChange1h: 1.2,
      priceChange6h: -3.4,
      buys24h: 15,
      sells24h: 8,
      pairCreatedAt: 1_700_000_000_000,
    });
  });

  it("ignores insecure image URLs from upstream market metadata", () => {
    const market = normalizePairs([{
      ...pool("insecure-icon", "0.25", 20_000),
      info: { imageUrl: "http://cdn.example.test/dog.png" },
    }])[0];
    expect(market.imageUrl).toBeNull();
  });
});
