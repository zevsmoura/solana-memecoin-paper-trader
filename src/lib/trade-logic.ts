import { BPS, SLIPPAGE_BPS, TRADE_FEE_BPS } from "@/lib/config";

export type BuyInput = { balance: bigint; solAmount: bigint; priceUsd: string; solUsd: string; liquidityUsd: number; minLiquidityUsd: number; feeBps?: bigint; slippageBps?: bigint };
export type SellInput = { balance: bigint; quantity: string; priceUsd: string; solUsd: string; liquidityUsd: number; minLiquidityUsd: number; feeBps?: bigint; slippageBps?: bigint };
export function calculateRealizedPnl(quantity: string, entryPrice: string, exitPrice: string) {
  const q=Number(quantity), entry=Number(entryPrice), exit=Number(exitPrice);
  if(!Number.isFinite(q)||!Number.isFinite(entry)||!Number.isFinite(exit)) throw new Error("Invalid P&L inputs.");
  return q*(exit-entry);
}
export function assertSellQuantity(owned: string, requested: string) {
  const a=decimalParts(owned), b=decimalParts(requested);
  if(b.value<=0n) throw new Error("Sell quantity must be greater than zero.");
  const scale=a.scale>b.scale?a.scale:b.scale;
  if(a.value*(scale/a.scale)<b.value*(scale/b.scale)) throw new Error("You cannot sell more tokens than you own.");
}
const pow10 = (digits: number) => 10n ** BigInt(digits);
function decimalParts(value: string) {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("Invalid price.");
  const [whole, fraction = ""] = value.split(".");
  return { value: BigInt(whole + fraction), scale: pow10(fraction.length) };
}
function assertLiquidity(liquidity: number, minimum: number) {
  if (!Number.isFinite(liquidity) || liquidity < minimum) throw new Error(`Trading is disabled below $${minimum.toLocaleString()} pool liquidity.`);
}
function fee(amount: bigint, rate: bigint) { return (amount * rate + BPS - 1n) / BPS; }
export function executeBuy(input: BuyInput) {
  if (input.solAmount <= 0n) throw new Error("Buy amount must be greater than zero.");
  const feeBps = input.feeBps ?? TRADE_FEE_BPS;
  const slip = input.slippageBps ?? SLIPPAGE_BPS;
  const costFee = fee(input.solAmount, feeBps);
  const totalDebit = input.solAmount + costFee;
  if (totalDebit > input.balance) throw new Error("Insufficient virtual SOL balance.");
  assertLiquidity(input.liquidityUsd, input.minLiquidityUsd);
  const price = decimalParts(input.priceUsd);
  const solPrice = decimalParts(input.solUsd);
  // Token units are represented as a decimal string with 12 significant fractional places.
  const tokenScale = 1_000_000_000_000n;
  const quantityAtoms = input.solAmount * solPrice.value * price.scale * tokenScale * BPS /
    (1_000_000_000n * solPrice.scale * price.value * (BPS + slip));
  const quantity = `${quantityAtoms / tokenScale}.${(quantityAtoms % tokenScale).toString().padStart(12, "0")}`;
  return { balance: input.balance - totalDebit, quantity, feeLamports: costFee, executionPriceUsd: (Number(price.value) / Number(price.scale)) * (1 + Number(slip) / Number(BPS)) };
}
export function executeSell(input: SellInput) {
  const quantity = decimalParts(input.quantity);
  if (quantity.value <= 0n) throw new Error("Sell quantity must be greater than zero.");
  assertLiquidity(input.liquidityUsd, input.minLiquidityUsd);
  const price = decimalParts(input.priceUsd);
  const solPrice = decimalParts(input.solUsd);
  const grossLamports = quantity.value * price.value * solPrice.scale * 1_000_000_000n /
    (quantity.scale * price.scale * solPrice.value);
  const feeLamports = fee(grossLamports, input.feeBps ?? TRADE_FEE_BPS);
  const slippage = fee(grossLamports, input.slippageBps ?? SLIPPAGE_BPS);
  const net = grossLamports - feeLamports - slippage;
  if (net <= 0n) throw new Error("Trade proceeds are too small after fees and slippage.");
  return { balance: input.balance + net, grossLamports, feeLamports, slippageLamports: slippage, netLamports: net,
    executionPriceUsd: Number(price.value) / Number(price.scale) * (1 - Number(input.slippageBps ?? SLIPPAGE_BPS) / Number(BPS)) };
}
