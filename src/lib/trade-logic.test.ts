import { describe, expect, it } from "vitest";
import { assertSellQuantity, calculateRealizedPnl, executeBuy, executeSell } from "@/lib/trade-logic";
const common={priceUsd:"0.00001",solUsd:"150",liquidityUsd:50_000,minLiquidityUsd:10_000};
describe("paper trade execution",()=>{
  it("buys with integer lamports and accounts for fees and slippage",()=>{const fill=executeBuy({balance:10_000_000_000n,solAmount:1_000_000_000n,...common});expect(fill.balance).toBe(8_995_000_000n);expect(Number(fill.quantity)).toBeCloseTo(14_851_485,0);expect(fill.feeLamports).toBe(5_000_000n);expect(fill.executionPriceUsd).toBeCloseTo(.0000101)});
  it("rejects a buy that exceeds the balance including fees",()=>expect(()=>executeBuy({balance:100n,solAmount:100n,...common})).toThrow(/Insufficient/));
  it("rejects pools below the liquidity threshold",()=>expect(()=>executeBuy({balance:1_000_000_000n,solAmount:100n,...common,liquidityUsd:9999})).toThrow(/liquidity/));
  it("rejects zero or malformed amounts",()=>{expect(()=>executeBuy({balance:10n,solAmount:0n,...common})).toThrow(/greater than zero/);expect(()=>executeBuy({balance:10n,solAmount:1n,...common,priceUsd:"NaN"})).toThrow(/Invalid price/)});
  it("sells with slippage, fees and exact lamport accounting",()=>{const fill=executeSell({balance:0n,quantity:"100",priceUsd:"0.01",solUsd:"100",liquidityUsd:50_000,minLiquidityUsd:10_000});expect(fill.grossLamports).toBe(10_000_000n);expect(fill.feeLamports).toBe(50_000n);expect(fill.slippageLamports).toBe(100_000n);expect(fill.netLamports).toBe(9_850_000n);expect(fill.executionPriceUsd).toBeCloseTo(.0099)});
  it("rejects selling more than owned",()=>expect(()=>assertSellQuantity("1.25","1.250000000001")).toThrow(/more tokens/));
  it("accepts exact full balance sales",()=>expect(()=>assertSellQuantity("1.2500","1.25")).not.toThrow());
  it("calculates realized profit and loss",()=>{expect(calculateRealizedPnl("3","0.1","0.15")).toBeCloseTo(.15);expect(calculateRealizedPnl("2","0.2","0.1")).toBeCloseTo(-.2)});
  it("rejects zero sell quantities",()=>expect(()=>executeSell({balance:0n,quantity:"0",...common})).toThrow(/greater than zero/));
});
