# Memeport

Memeport is a practice app for exploring Solana memecoins and trying trades with virtual SOL. It uses live market data, but trades only change your practice balance inside Memeport.

**There are no real trades, wallet connections, private keys, or real funds.**

## Try the app

Open [memeport.vercel.app](https://memeport.vercel.app), create an account, and start with 10 virtual SOL.

You can browse Solana tokens, search by name, ticker, or mint address, open a token page, and try the buy or sell buttons. Market caps use short labels such as `$2.1M` and `$100K`. On a token page, the chart sits beside the instant-trade panel. You can change the trade presets in that panel.

## Run Memeport on your computer

You need [Node.js 20.9 or newer](https://nodejs.org/) and pnpm. Install pnpm with:

```bash
npm install --global pnpm
```

Then download the project and install its packages:

```bash
git clone https://github.com/zevsmoura/solana-memecoin-paper-trader.git
cd solana-memecoin-paper-trader
pnpm install
```

Create your local settings file. On Windows PowerShell, run:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, run:

```bash
cp .env.example .env
```

Open `.env` and replace the example `SESSION_SECRET` with a random string that is at least 32 characters long. You can make one by running:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `.env`. Then create the local database and start Memeport:

```bash
pnpm db:push
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000). The local database is saved in `prisma/dev.db`.

## How it works

- New accounts start with 10 virtual SOL. Passwords are hashed, and sign-in uses a secure session cookie.
- The market list combines newly created and popular Solana pools with recently listed and promoted tokens. It refreshes while the page is open. Search suggestions appear as you type, and you can sort the market columns.
- Token charts use TradingView Lightweight Charts to draw candlesticks from GeckoTerminal pool data. DexScreener provides token search and market details.
- Buy and sell buttons use saved presets. Clicking one submits a paper trade immediately. The server checks the current price, your balance or token holdings, and pool liquidity before recording the trade. Each trade simulates 1% slippage and a 0.5% fee.
- Your holdings, trade history, and practice balance are stored in the database. No blockchain transactions are made.

## Settings

These values are in `.env`:

| Setting | What it changes |
| --- | --- |
| `DATABASE_URL` | Where the database is stored. The example uses a local SQLite file. |
| `SESSION_SECRET` | A random secret used to protect sign-in sessions. Use at least 32 characters. |
| `STARTING_BALANCE_LAMPORTS` | The starting virtual SOL balance. The default is 10 SOL. |
| `MIN_LIQUIDITY_USD` | The minimum pool liquidity required to allow a paper trade. The default is $10,000. |
| `TRADE_FEE_BPS` | The simulated fee. The default `50` means 0.5%. |
| `MARKET_DATA_MOCK` | Uses a fake demo token for local development when set to `true`. Leave this `false` for real market data. |

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the local development app. |
| `pnpm db:push` | Creates or updates the local database tables. |
| `pnpm lint` | Checks code style and common mistakes. |
| `pnpm typecheck` | Checks TypeScript types. |
| `pnpm test` | Runs the trade, market-data, and formatting tests. |
| `pnpm build` | Creates a production build. |
| `pnpm start` | Runs the production build on your computer. |

## Deploy your own copy

1. Import this GitHub repository into [Vercel](https://vercel.com/).
2. Add a managed PostgreSQL database to the Vercel project.
3. Set `DATABASE_URL` to the database connection string and set `SESSION_SECRET` to a new random value of at least 32 characters.
4. Deploy. The included Vercel build command prepares the database and builds the app.

Use PostgreSQL for a hosted deployment. The SQLite database is intended for local development.

## Notes and limitations

- Free market-data services can be delayed or temporarily unavailable. The discovery list is not a complete list of every token on Solana. You can search for a mint address when a token does not appear in discovery.
- Tokens with pool liquidity below the configured minimum can be shown, but cannot be traded in the app.
- The free data sources do not provide a complete price history for every token. Some new or inactive pools may not have enough candle data to display a full chart.
- The in-memory request limit resets when the server restarts and does not share counts across serverless instances.

## Disclaimer

Memeport is for education and entertainment. It is a simulation, does not execute real trades, and is not financial advice. Token information may be incomplete or inaccurate.
