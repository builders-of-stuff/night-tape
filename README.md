# Night Tape

A local market desk for the names you already bounce between CoinMarketCap, DexScreener, and TradingView.

```bash
pnpm install
pnpm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). Quotes stay in this browser (`localStorage`). There is no server and no API key.

## What's on the blotter

| Name                    | Source      | Live chart                         |
| ----------------------- | ----------- | ---------------------------------- |
| BTC, ZEC, SOL, SUI, ETH | CoinGecko   | TradingView embed + outbound links |
| ZCAT (Anonymous Cat)    | DexScreener | DexScreener embed                  |
| TSLA, SPCX, S&P 500     | CNBC        | TradingView embed                  |

Short-term sparklines and the **Short tape** tab are built from seeded history plus every poll (20s), kept in `localStorage`. **Full chart** is the real TradingView advanced chart or the DexScreener pool chart.

Each bay links out to TradingView, DexScreener, CMC, Yahoo, or Solscan depending on the name.

## Does this cost money?

For this repo: **no.**

| Feed                | Cost             | Notes                                                                                                                                                      |
| ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CoinGecko Demo      | Free             | Majors. Soft rate limit; the Vite proxy keeps it off CORS.                                                                                                 |
| DexScreener         | Free, no key     | ZCAT + any future meme.                                                                                                                                    |
| GeckoTerminal       | Free             | ZCAT candles when the pool quotes USD-like prices.                                                                                                         |
| CNBC quote feed     | Free, unofficial | Equities / SPX in one batched request.                                                                                                                     |
| Yahoo chart API     | Free, unofficial | Optional 1-day seed for the stock short-tape. Ignored if Yahoo 429s.                                                                                       |
| TradingView widgets | Free             | Same charts you already use. The licensed Charting Library is **not** used.                                                                                |
| CoinMarketCap       | Not used         | Basic plan is free with a key (~10k credits/mo) but the key cannot sit in a browser app. A tiny proxy would be required. CoinGecko covers the same majors. |

Paid upgrades only if you outgrow this: CMC Pro, Polygon / Twelve Data for stocks, TradingView Charting Library for a white-label TV clone.

## Alerts

Arm a tripwire on the focused name: price above, price below, or session move ≥ N%. Trips show as lamp toasts, in the trip log, and as desktop notifications if you click **Enable alerts**.

## Add a name

Edit `src/lib/assets.ts`. Crypto needs a CoinGecko id, a meme needs a token mint, a stock needs a CNBC symbol. Restart `pnpm run dev`.
