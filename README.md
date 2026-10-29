# Memeport — Solana memecoin paper trading

A responsive Next.js app for practicing Solana memecoin trades with virtual SOL and live market data. No wallet connection, real funds, or private keys are used.

## Requirements

- Node.js 20.9 or later
- pnpm 9 or later (or npm)

## Setup

```bash
pnpm install
Copy-Item .env.example .env
```

Set `SESSION_SECRET` to a random string of at least 32 characters. Then initialize the local SQLite database and start the dev server:

```bash
pnpm db:push
pnpm dev
```

Open http://localhost:3000 and sign up. New accounts start with 10 virtual SOL.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma database URL. SQLite for local development; use a hosted Postgres URL and update the Prisma provider for persistent Vercel deployments. |
| `SESSION_SECRET` | none | At least 32 random characters for signed HTTP-only sessions. |
| `STARTING_BALANCE_LAMPORTS` | `10000000000` | Virtual opening balance in lamports (10 SOL). |
| `MIN_LIQUIDITY_USD` | `10000` | Minimum pool liquidity allowed for trades. |
| `TRADE_FEE_BPS` | `50` | Simulated trade fee in basis points (50 = 0.5%). |
| `MARKET_DATA_MOCK` | `false` | Development only. Set to `true` for deterministic local end-to-end checks; it is ignored in production. |

## Scripts

- `pnpm dev` — development server
- `pnpm build` / `pnpm start` — production build and server
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript validation
- `pnpm test` — trade and market-provider unit tests
- `pnpm db:push` — synchronize Prisma schema to the database

For a local smoke test without an external market connection, set `MARKET_DATA_MOCK="true"` in `.env`, run the app in development mode, and use the demo `TEST` token. Never set this for production.

## Architecture

- Next.js App Router with TypeScript, Tailwind CSS 4, and server-rendered market/account pages.
- `src/lib/price-provider.ts` isolates public market APIs. DexScreener supplies name/mint search, profiles, boost activity, prices, trading activity, and artwork. GeckoTerminal adds Solana new-pool and top-pool discovery plus pool OHLCV candles.
- The market terminal refreshes the discovery catalogue every 45 seconds while visible, offers Trending, New pairs, Top volume, and Top gainers views, and lets players sort each market-data column in either direction. Search suggestions appear as the player types.
- Token pages render candlesticks with TradingView Lightweight Charts using GeckoTerminal pool data. The chart offers 1m, 5m, 15m, 1h, 4h, and 1d intervals. The app also stores one market snapshot per token per minute, keeps up to 14 days, and uses the latest saved market catalogue when live discovery is unavailable.
- The instant trade panel has editable, browser-saved SOL buy presets and percentage sell presets. Each preset executes immediately through the server-side paper-trade validator.
- Server-only trade execution fetches current prices, verifies pool liquidity and holdings, applies 1% slippage and a 0.5% fee, and records trades. Balances are stored as integer lamports (`BigInt`); token quantities and market prices are persisted as decimal strings.
- Prisma stores users, holdings, trades, the discovered token catalogue, and timestamped market snapshots. The default `prisma/schema.prisma` uses SQLite locally. Vercel uses `prisma/schema.postgresql.prisma`; its build command applies the schema and generates the matching client against the configured Postgres database.
- Passwords use bcrypt hashes. Sessions are signed JWTs in HTTP-only, SameSite cookies. No wallet or key handling exists.
- Basic security headers are configured in `next.config.ts`; API inputs are validated with Zod and rate limited in-process.

## Deploy to Vercel

1. Import `zevsmoura/solana-memecoin-paper-trader` into Vercel.
2. Attach a managed Postgres database and make its `DATABASE_URL` available to the project.
3. Configure `SESSION_SECRET` (32+ random characters) and any optional trade settings in Vercel environment variables.
4. Deploy. `vercel.json` syncs the PostgreSQL schema and generates the matching Prisma Client before building.

## Known limitations

- Free market-data providers can be unavailable or delayed. Discovery combines recent and top pools with DexScreener's recent profiles and boosts; it is not a complete index of every mint on Solana. Search by exact mint to open any token DexScreener indexes. Thin pools can appear in discovery, but server-side checks block trading below the configured liquidity minimum.
- Daily and weekly leaderboard filters count trades in those periods; return percentage is still measured against the original 10 SOL baseline because the app does not yet store balance snapshots.
- The in-memory rate limiter resets on server restarts and does not coordinate across serverless instances.
- Saved market snapshots cover tokens users discover or open, are sampled at most once per minute, and are pruned after 14 days. Historical prices for every Solana token are not retained.
- Use persistent Postgres for real deployments; the included SQLite setup is intended for local development.

## Disclaimer

This app is a simulation for education and entertainment only. It does not execute real trades, connect to wallets, or provide financial advice. Token data can be inaccurate, stale, or incomplete. Nothing here is financial advice.
