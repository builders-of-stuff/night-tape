import { cx, formatPct, formatPrice } from "../lib/format";
import type { Asset, Quote } from "../lib/types";

type Props = {
  assets: Asset[];
  quotes: Record<string, Quote>;
  flashed: Record<string, number>;
  now: number;
};

function Print({
  symbol,
  quote,
  fresh,
}: {
  symbol: string;
  quote?: Quote;
  fresh: boolean;
}) {
  const up = (quote?.changePct ?? 0) >= 0;
  return (
    <span className="mx-6 inline-flex items-baseline gap-3 font-mono text-[13px] tracking-wide">
      <span className="text-ghost">{symbol}</span>
      <span className={cx("tabular text-paper", fresh && "print-fresh")}>
        {quote ? `$${formatPrice(quote.price)}` : "—"}
      </span>
      <span className={cx("tabular", up ? "text-copper" : "text-frost")}>
        {quote ? formatPct(quote.changePct) : ""}
      </span>
    </span>
  );
}

export function TickerTape({ assets, quotes, flashed, now }: Props) {
  const prints = (lane: string) =>
    assets.map((asset) => (
      <Print
        key={`${lane}-${asset.id}`}
        symbol={asset.symbol}
        quote={quotes[asset.id]}
        fresh={now - (flashed[asset.id] ?? 0) < 2800}
      />
    ));
  return (
    <div className="tape-rail relative overflow-hidden border-y border-rule">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#14110d] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#14110d] to-transparent" />
      <div className="tape-track whitespace-nowrap py-2.5 pl-10 pr-10">
        <div className="flex items-center">{prints("a")}</div>
        <div className="flex items-center" aria-hidden>
          {prints("b")}
        </div>
      </div>
    </div>
  );
}
