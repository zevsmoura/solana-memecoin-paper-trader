export const LAMPORTS_PER_SOL = 1_000_000_000n;
export const STARTING_BALANCE = BigInt(process.env.STARTING_BALANCE_LAMPORTS ?? "10000000000");
export const MIN_LIQUIDITY_USD = Number(process.env.MIN_LIQUIDITY_USD ?? "10000");
export const TRADE_FEE_BPS = BigInt(process.env.TRADE_FEE_BPS ?? "50");
export const SLIPPAGE_BPS = 100n;
export const BPS = 10_000n;
