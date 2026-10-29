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
- `pnpm test` — trade-logic unit tests
- `pnpm db:push` — synchronize Prisma schema to the database

For a local smoke test without an external market connection, set `MARKET_DATA_MOCK="true"` in `.env`, run the app in development mode, and use the demo `TEST` token. Never set this for production.

## Architecture

- Next.js App Router with TypeScript, Tailwind CSS 4, and server-rendered market/account pages.
- `src/lib/price-provider.ts` isolates public data APIs: DexScreener supplies token search, metadata, and current prices; GeckoTerminal supplies historical OHLC candles because DexScreener does not expose a candle endpoint.
- Server-only trade execution fetches current prices, verifies pool liquidity and holdings, applies 1% slippage and a 0.5% fee, and records trades. Balances are stored as integer lamports (`BigInt`); token quantities and market prices are persisted as decimal strings.
- Prisma schema separates users, token holdings, and trade records. SQLite is convenient locally; SQLite files are ephemeral on Vercel serverless instances, so configure managed Postgres for production persistence and change the Prisma datasource provider to `postgresql`.
- Passwords use bcrypt hashes. Sessions are signed JWTs in HTTP-only, SameSite cookies. No wallet or key handling exists.
- Basic security headers are configured in `next.config.ts`; API inputs are validated with Zod and rate limited in-process.

## Deploy to Vercel

1. Push this repository to GitHub and import it into Vercel.
2. Configure a managed Postgres database. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma` and set `DATABASE_URL` to the provider's connection string.
3. Configure `SESSION_SECRET` (32+ random characters) and the optional trade settings in Vercel environment variables.
4. Run `pnpm prisma db push` against the production database, then deploy. Keep Prisma Client generation in the build/install lifecycle.

## Known limitations

- Market providers and free-tier rate limits can be unavailable or delayed. Search is cached briefly; candles may be missing for new pools.
- Daily and weekly leaderboard filters count trades in those periods; return percentage is still measured against the original 10 SOL baseline because the app does not yet store balance snapshots.
- The in-memory rate limiter resets on server restarts and does not coordinate across serverless instances.
- Historical token prices are not retained, so unrealized portfolio values depend on current provider responses.
- Use persistent Postgres for real deployments; the included SQLite setup is intended for local development.

## Disclaimer

This app is a simulation for education and entertainment only. It does not execute real trades, connect to wallets, or provide financial advice. Token data can be inaccurate, stale, or incomplete. Nothing here is financial advice.
