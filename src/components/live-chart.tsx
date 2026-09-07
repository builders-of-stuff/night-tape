import { useEffect, useRef } from "react";
import type { Asset, Quote } from "../lib/types";

type Props = {
  asset: Asset;
  quote?: Quote;
};

export function LiveChart({ asset, quote }: Props) {
  if (asset.kind === "dex") {
    const pair = quote?.pairAddress;
    const chain = asset.chain ?? "solana";
    if (!pair) {
      return (
        <div className="flex h-full items-center justify-center font-mono text-xs text-ghost">
          Waiting on a DexScreener pool…
        </div>
      );
    }
    const src = `https://dexscreener.com/${chain}/${pair}?embed=1&theme=dark&trades=0&info=0`;
    return (
      <iframe
        title={`${asset.symbol} DexScreener`}
        src={src}
        className="h-full w-full border-0 bg-blotter"
        allow="clipboard-write"
      />
    );
  }

  if (asset.tradingView) {
    return <TradingViewFrame symbol={asset.tradingView} />;
  }

  return (
    <div className="flex h-full items-center justify-center font-mono text-xs text-ghost">
      No live chart for this name.
    </div>
  );
}

function TradingViewFrame({ symbol }: { symbol: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    host.replaceChildren();

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    container.style.height = "100%";
    container.style.width = "100%";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "America/Los_Angeles",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "#12151F",
      gridColor: "rgba(42, 49, 72, 0.35)",
      hide_top_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    container.append(widget, script);
    host.append(container);

    return () => {
      host.replaceChildren();
    };
  }, [symbol]);

  return <div ref={box} className="h-full min-h-[280px] w-full" />;
}
