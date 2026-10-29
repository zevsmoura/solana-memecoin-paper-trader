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
});
