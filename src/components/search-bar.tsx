import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKey,
} from "react";
import type { Asset } from "../lib/types";
import { findOnDesk } from "../lib/watchlist";
import {
  isTickerQuery,
  searchMarkets,
  type SearchGroup,
  type SearchHit,
} from "../services/search";

type Props = {
  assets: Asset[];
  onAdd: (asset: Asset) => void;
  onFocus: (id: string) => void;
};

const LABELS: Record<SearchGroup, string> = {
  coin: "Coins",
  dex: "Dex",
  stock: "Stocks & funds",
};

export function SearchBar({ assets, onAdd, onFocus }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      void searchMarkets(q)
        .then((rows) => {
          setHits(rows);
          setActive(0);
          setError(rows.length ? null : "Nothing matched.");
        })
        .catch(() => {
          setHits([]);
          setError("Search failed. Try again in a moment.");
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !inField(e.target)) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function pick(hit: SearchHit) {
    const existing = findOnDesk(hit.asset, assets);
    if (existing) {
      onFocus(existing.id);
    } else {
      onAdd(hit.asset);
    }
    setQuery("");
    setHits([]);
    setOpen(false);
    input.current?.blur();
  }

  function onKeys(e: ReactKey<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) pick(hit);
    }
  }

  const groupOrder: SearchGroup[] = isTickerQuery(query)
    ? ["stock", "coin", "dex"]
    : ["coin", "dex", "stock"];
  const groups = groupOrder
    .map((group) => ({
      group,
      rows: hits
        .map((hit, index) => ({ hit, index }))
        .filter((row) => row.hit.group === group),
    }))
    .filter((g) => g.rows.length);

  return (
    <div ref={box} className="relative px-5 pb-3">
      <label className="sr-only" htmlFor={listId}>
        Add a name
      </label>
      <div className="flex items-center gap-3 border border-rule bg-blotter px-3 py-2 focus-within:border-copper">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-copper">
          add
        </span>
        <input
          id={listId}
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeys}
          placeholder="Search coins, tickers, or a mint — / to focus"
          className="w-full bg-transparent font-mono text-sm text-paper outline-none placeholder:text-ghost"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
        />
        {loading && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ghost">
            hunting
          </span>
        )}
      </div>

      {open && query.trim() && (
        <div
          id={`${listId}-list`}
          role="listbox"
          className="absolute left-5 right-5 z-30 mt-1 max-h-[min(60vh,420px)] overflow-auto border border-rule bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        >
          {error && !hits.length && (
            <p className="px-3 py-3 font-mono text-xs text-ghost">{error}</p>
          )}
          {groups.map(({ group, rows }) => (
            <div key={group}>
              <div className="sticky top-0 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-copper">
                {LABELS[group]}
              </div>
              {rows.map(({ hit, index }) => {
                const onDesk = Boolean(findOnDesk(hit.asset, assets));
                return (
                  <button
                    key={hit.key}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(hit)}
                    className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left ${
                      index === active ? "bg-blotter" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-display text-sm font-bold tracking-wide">
                        {hit.asset.symbol}
                      </span>
                      <span className="ml-2 text-sm text-ghost">{hit.asset.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ghost">
                      {onDesk ? "on tape" : hit.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function inField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
