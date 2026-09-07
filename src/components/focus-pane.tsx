import { useMemo, useState } from "react";
import { formatPct, formatPrice, kindLabel } from "../lib/format";
import type { AlertKind, AlertRule, Asset, Quote, Tick } from "../lib/types";
import { LiveChart } from "./live-chart";
import { LocalChart, type Range } from "./local-chart";

type Props = {
  asset: Asset;
  quote?: Quote;
  ticks: Tick[];
  rules: AlertRule[];
  onAddRule: (kind: AlertKind, value: number) => void;
  onRemoveRule: (id: string) => void;
  onDrop?: () => void;
};

export function FocusPane({
  asset,
  quote,
  ticks,
  rules,
  onAddRule,
  onRemoveRule,
  onDrop,
}: Props) {
  const [tab, setTab] = useState<"full" | "tape">("full");
  const [range, setRange] = useState<Range>("1D");
  const up = (quote?.changePct ?? 0) >= 0;
  const mine = rules.filter((r) => r.assetId === asset.id);
  const dexLink = quote?.pairUrl;

  const links = useMemo(() => {
    const extra = dexLink ? [{ label: "This pool", href: dexLink }] : [];
    const seen = new Set<string>();
    return [...extra, ...asset.links].filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });
  }, [asset.links, dexLink]);

  return (
    <aside className="flex min-h-0 flex-col border border-rule bg-blotter">
      <header className="border-b border-rule px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
              {kindLabel(asset.kind)} blotter
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-wide">
              {asset.symbol}
              <span className="ml-2 text-base font-semibold tracking-normal text-ghost">
                {asset.name}
              </span>
            </h2>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl tabular">
              {quote ? `$${formatPrice(quote.price)}` : "—"}
            </div>
            <div
              className={`font-mono text-sm tabular ${up ? "text-copper" : "text-frost"}`}
            >
              {formatPct(quote?.changePct)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 border-b border-rule px-2 py-1">
        <div className="flex">
          <TabButton active={tab === "full"} onClick={() => setTab("full")}>
            Full chart
          </TabButton>
          <TabButton active={tab === "tape"} onClick={() => setTab("tape")}>
            Short tape
          </TabButton>
        </div>
        {tab === "tape" && (
          <div className="flex gap-1">
            {(["1H", "4H", "1D", "7D"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2 py-1 font-mono text-[10px] tracking-wider ${
                  range === r ? "text-lamp" : "text-ghost"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-[min(52vh,520px)] min-h-[280px] bg-ink">
        {tab === "full" ? (
          <LiveChart asset={asset} quote={quote} />
        ) : (
          <LocalChart ticks={ticks} up={up} range={range} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-2 font-mono text-[11px]">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-copper underline-offset-4 hover:text-lamp hover:underline"
          >
            {link.label} ↗
          </a>
        ))}
        {onDrop && (
          <button
            type="button"
            onClick={onDrop}
            className="ml-auto text-ghost hover:text-stamp"
          >
            Drop from desk
          </button>
        )}
      </div>

      <AlertForm
        asset={asset}
        quote={quote}
        rules={mine}
        onAdd={onAddRule}
        onRemove={onRemoveRule}
      />
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
        active ? "text-lamp" : "text-ghost"
      }`}
    >
      {children}
    </button>
  );
}

function AlertForm({
  asset,
  quote,
  rules,
  onAdd,
  onRemove,
}: {
  asset: Asset;
  quote?: Quote;
  rules: AlertRule[];
  onAdd: (kind: AlertKind, value: number) => void;
  onRemove: (id: string) => void;
}) {
  const [kind, setKind] = useState<AlertKind>("above");
  const [value, setValue] = useState("");

  return (
    <div className="border-t border-rule px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
        Tripwires
      </div>
      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(value);
          onAdd(kind, n);
          setValue("");
        }}
      >
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AlertKind)}
          className="border border-rule bg-ink px-2 py-1.5 font-mono text-xs text-paper"
        >
          <option value="above">price above</option>
          <option value="below">price below</option>
          <option value="move">|session move| ≥ %</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          placeholder={kind === "move" ? "5" : formatPrice(quote?.price)}
          className="w-28 border border-rule bg-ink px-2 py-1.5 font-mono text-xs text-paper"
        />
        <button
          type="submit"
          className="border border-copper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-copper hover:bg-copper hover:text-ink"
        >
          Arm {asset.symbol}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {rules.length === 0 && (
          <p className="text-xs text-ghost">
            No trips. Arm a level and it fires here plus as a desktop notification.
          </p>
        )}
        {rules.map((rule) => (
          <button
            key={rule.id}
            type="button"
            onClick={() => onRemove(rule.id)}
            className="border border-rule px-2 py-1 font-mono text-[11px] text-paper hover:border-stamp hover:text-stamp"
            title="Remove"
          >
            {rule.kind === "move"
              ? `±${rule.value}%`
              : `${rule.kind} ${formatPrice(rule.value)}`}{" "}
            ×
          </button>
        ))}
      </div>
    </div>
  );
}
