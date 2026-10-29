import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { MIN_LIQUIDITY_USD } from "@/lib/config";
import { db } from "@/lib/db";
import { getSolUsd, getToken } from "@/lib/price-provider";
import { rateLimit } from "@/lib/rate-limit";
import { assertSellQuantity, executeBuy, executeSell } from "@/lib/trade-logic";

const schema = z.object({
  side: z.enum(["BUY", "SELL"]),
  tokenAddress: z.string().min(32).max(64),
  amount: z.string().regex(/^\d+(\.\d{1,12})?$/),
});

function parseLamports(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > 9) throw new Error("SOL amounts support up to 9 decimal places.");
  return BigInt(whole!) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in before trading." }, { status: 401 });
  if (!rateLimit(`trade:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Too many trades. Please wait a minute." }, { status: 429 });

  try {
    const input = schema.parse(await req.json());
    const [token, solUsd] = await Promise.all([getToken(input.tokenAddress), getSolUsd()]);
    if (token.liquidityUsd < MIN_LIQUIDITY_USD) throw new Error(`Trading is disabled below $${MIN_LIQUIDITY_USD.toLocaleString()} pool liquidity.`);

    const result = await db.$transaction(async tx => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const holding = await tx.holding.findUnique({ where: { userId_tokenAddress: { userId: user.id, tokenAddress: token.address } } });

      if (input.side === "BUY") {
        const solAmount = parseLamports(input.amount);
        const fill = executeBuy({ balance: fresh.balance, solAmount, priceUsd: token.priceUsd, solUsd: String(solUsd), liquidityUsd: token.liquidityUsd, minLiquidityUsd: MIN_LIQUIDITY_USD });
        const debit = solAmount + fill.feeLamports;
        const debitResult = await tx.user.updateMany({ where: { id: user.id, balance: { gte: debit } }, data: { balance: { decrement: debit } } });
        if (!debitResult.count) throw new Error("Insufficient virtual SOL balance.");

        const prior = Number(holding?.quantity ?? 0);
        const added = Number(fill.quantity);
        const average = prior + added === 0 ? Number(fill.executionPriceUsd) : (prior * Number(holding?.averageEntry ?? 0) + added * Number(fill.executionPriceUsd)) / (prior + added);
        const quantity = String(prior + added);
        if (holding) {
          const updated = await tx.holding.updateMany({ where: { id: holding.id, quantity: holding.quantity }, data: { quantity, averageEntry: String(average), symbol: token.symbol, name: token.name } });
          if (!updated.count) throw new Error("Your holding changed during this trade. Please retry.");
        } else {
          await tx.holding.create({ data: { userId: user.id, tokenAddress: token.address, symbol: token.symbol, name: token.name, quantity: fill.quantity, averageEntry: String(average) } });
        }
        await tx.trade.create({ data: { userId: user.id, tokenAddress: token.address, symbol: token.symbol, side: "BUY", quantity: fill.quantity, priceUsd: String(fill.executionPriceUsd), solAmount, feeLamports: fill.feeLamports } });
        return { quantity: fill.quantity, balance: (fresh.balance - debit).toString() };
      }

      if (!holding) throw new Error("You do not own this token.");
      assertSellQuantity(holding.quantity, input.amount);
      const fill = executeSell({ balance: fresh.balance, quantity: input.amount, priceUsd: token.priceUsd, solUsd: String(solUsd), liquidityUsd: token.liquidityUsd, minLiquidityUsd: MIN_LIQUIDITY_USD });
      const held = Number(holding.quantity);
      const sold = Number(input.amount);
      const remaining = Math.max(0, held - sold);
      const realizedDelta = sold * (Number(fill.executionPriceUsd) - Number(holding.averageEntry));
      if (remaining < 1e-12) {
        await tx.holding.delete({ where: { id: holding.id } });
      } else {
        const updated = await tx.holding.updateMany({ where: { id: holding.id, quantity: holding.quantity }, data: { quantity: String(remaining), realizedPnl: String(Number(holding.realizedPnl) + realizedDelta) } });
        if (!updated.count) throw new Error("Your holding changed during this trade. Please retry.");
      }
      await tx.user.update({ where: { id: user.id }, data: { balance: { increment: fill.netLamports } } });
      await tx.trade.create({ data: { userId: user.id, tokenAddress: token.address, symbol: token.symbol, side: "SELL", quantity: input.amount, priceUsd: String(fill.executionPriceUsd), solAmount: fill.netLamports, feeLamports: fill.feeLamports, realizedPnlUsd: String(realizedDelta) } });
      return { quantity: input.amount, balance: (fresh.balance + fill.netLamports).toString() };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Enter a valid trade amount and token address." : error instanceof Error ? error.message : "Trade could not be completed." }, { status: 400 });
  }
}
