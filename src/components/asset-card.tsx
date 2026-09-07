import {
  formatCompact,
  formatPct,
  formatPrice,
  kindLabel,
  sessionLabel,
} from "../lib/format";
import type { Asset, Quote, Tick } from "../lib/types";
import { Sparkline } from "./sparkline";

type Props = {
  asset: Asset;
  quote?: Quote;
  ticks: Tick[];
  active: boolean;
  fresh: boolean;
  onFocus: () => void;
  onRemove?: () => void;
};

export function AssetCard({
  asset,
  quote,
  ticks,
  active,
  fresh,
  onFocus,
  onRemove,
}: Props) {
  const up = (quote?.changePct ?? 0) >= 0;
  const spark = ticks.slice(-80).map((t) => t.p);
  const windows = quote?.windows;

  return (
    <div
      className={`bay relative flex h-full w-full flex-col ${active ? "bay-live" : ""}`}
    >
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-2 top-2 z-10 px-1.5 font-mono text-[11px] text-ghost hover:text-stamp"
          title={`Drop ${asset.symbol}`}
          aria-label={`Drop ${asset.symbol}`}
        >
          ×
        </button>
      )}
      <button
        type="button"
        onClick={onFocus}
        className="flex h-full w-full flex-col p-3.5 pr-7 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-lg font-extrabold tracking-wide text-paper">
              {asset.symbol}
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-ghost">
              {asset.name}
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
            {kindLabel(asset.kind)} · {sessionLabel(asset.kind)}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div
              className={`font-mono text-[26px] font-medium leading-none tabular ${fresh ? "print-fresh" : "text-paper"}`}
            >
              {quote ? `$${formatPrice(quote.price)}` : "—"}
            </div>
            <div
              className={`mt-1.5 font-mono text-[13px] tabular ${up ? "text-copper" : "text-frost"}`}
            >
              {up ? "▲" : "▼"} {formatPct(quote?.changePct)}
            </div>
          </div>
          <div className="w-[42%] min-w-24">
            {spark.length >= 2 ? (
              <Sparkline points={spark} up={up} />
            ) : (
              <div className="flex h-9 items-end justify-end font-mono text-[10px] uppercase tracking-wider text-ghost">
                collecting
              </div>
            )}
          </div>
        </div>

        {asset.kind === "dex" && windows ? (
          <div className="mt-3 grid grid-cols-4 gap-1 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-wider text-ghost">
            {(["m5", "h1", "h6", "h24"] as const).map((key) => {
              const n = windows[key];
              const localUp = (n ?? 0) >= 0;
              return (
                <div key={key}>
                  <div>{key}</div>
                  <div className={localUp ? "text-copper" : "text-frost"}>
                    {formatPct(n)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex gap-4 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-wider text-ghost">
            {quote?.marketCap != null && (
              <span>mcap {formatCompact(quote.marketCap)}</span>
            )}
            {quote?.volume != null && <span>vol {formatCompact(quote.volume)}</span>}
            {quote?.liquidity != null && (
              <span>liq {formatCompact(quote.liquidity)}</span>
            )}
            {quote?.dayLow != null && quote.dayHigh != null && (
              <span>
                {formatPrice(quote.dayLow)}–{formatPrice(quote.dayHigh)}
              </span>
            )}
            {quote && (
              <span className="ml-auto normal-case tracking-normal">
                {quote.source}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
