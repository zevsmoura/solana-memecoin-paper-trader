import { LAMPORTS_PER_SOL } from "@/lib/config";
export const formatSol = (lamports: bigint, digits = 4) => (Number(lamports) / Number(LAMPORTS_PER_SOL)).toFixed(digits);
export const solToLamports = (sol: string) => {
  if (!/^\d+(\.\d{1,9})?$/.test(sol)) throw new Error("Enter a valid SOL amount with up to 9 decimals.");
  const [whole, fraction = ""] = sol.split(".");
  return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(9, "0"));
};
export const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);
export const compactUsd = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
    compactDisplay: "short",
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 1 : value < 1 ? 6 : 2,
  }).format(value);
};
