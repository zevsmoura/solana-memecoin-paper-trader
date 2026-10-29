import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Memeport — Solana paper trading", description: "Trade Solana memecoins with virtual SOL and live market data." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
