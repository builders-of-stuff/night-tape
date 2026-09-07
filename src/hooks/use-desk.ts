import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALERT_COOLDOWN_MS, DEFAULT_ASSETS, DEFAULT_IDS, POLL_MS } from "../lib/assets";
import { formatPct, formatPrice } from "../lib/format";
import { appendQuoteTick, loadDesk, mergeTicks, saveDesk, uid } from "../lib/storage";
import type {
  AlertEvent,
  AlertKind,
  AlertRule,
  Asset,
  Quote,
  Tick,
} from "../lib/types";
import { composeWatchlist, findOnDesk, sameAsset } from "../lib/watchlist";
import { fetchAllQuotes } from "../services/quotes";

const initial = loadDesk();

function evaluate(
  quote: Quote,
  rules: AlertRule[],
  assets: Asset[],
): { rules: AlertRule[]; events: AlertEvent[] } {
  const now = Date.now();
  const events: AlertEvent[] = [];
  const next = rules.map((rule) => {
    if (!rule.enabled || rule.assetId !== quote.id) return rule;
    if (rule.lastFiredAt && now - rule.lastFiredAt < ALERT_COOLDOWN_MS) return rule;
    const asset = assets.find((a) => a.id === quote.id);
    const symbol = asset?.symbol ?? quote.id.toUpperCase();
    let tripped = false;
    let message = "";
    if (rule.kind === "above" && quote.price >= rule.value) {
      tripped = true;
      message = `${symbol} printed $${formatPrice(quote.price)} — above ${formatPrice(rule.value)}`;
    } else if (rule.kind === "below" && quote.price <= rule.value) {
      tripped = true;
      message = `${symbol} printed $${formatPrice(quote.price)} — below ${formatPrice(rule.value)}`;
    } else if (rule.kind === "move" && Math.abs(quote.changePct) >= rule.value) {
      tripped = true;
      message = `${symbol} is ${formatPct(quote.changePct)} on the session — ${rule.value}% trip`;
    }
    if (!tripped) return rule;
    events.push({
      id: uid(),
      ruleId: rule.id,
      assetId: quote.id,
      message,
      at: now,
      price: quote.price,
    });
    return { ...rule, lastFiredAt: now };
  });
  return { rules: next, events };
}

function notifyBrowser(event: AlertEvent) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Night Tape", { body: event.message });
  } catch {
    // Safari private / denied after the check.
  }
}

export function useDesk() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>(initial.quotes);
  const [ticks, setTicks] = useState<Record<string, Tick[]>>(initial.ticks);
  const [rules, setRules] = useState<AlertRule[]>(initial.rules);
  const [events, setEvents] = useState<AlertEvent[]>(initial.events);
  const [focusId, setFocusId] = useState(initial.focusId);
  const [customAssets, setCustomAssets] = useState<Asset[]>(initial.customAssets);
  const [hiddenIds, setHiddenIds] = useState<string[]>(initial.hiddenIds);
  const [status, setStatus] = useState<"live" | "error" | "idle">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(
    Object.values(initial.quotes)[0]?.asOf ?? null,
  );
  const [flashed, setFlashed] = useState<Record<string, number>>({});
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const seededRef = useRef(false);

  const assets = useMemo(
    () => composeWatchlist(customAssets, hiddenIds),
    [customAssets, hiddenIds],
  );
  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  const applyBatch = useCallback(
    (batch: Awaited<ReturnType<typeof fetchAllQuotes>>) => {
      const flash: Record<string, number> = {};
      setQuotes((prev) => {
        const next = { ...prev };
        for (const quote of batch.quotes) {
          const prior = prev[quote.id];
          if (prior && prior.price !== quote.price) flash[quote.id] = Date.now();
          next[quote.id] = quote;
        }
        return next;
      });
      if (Object.keys(flash).length) {
        setFlashed((f) => ({ ...f, ...flash }));
      }
      setTicks((prev) => {
        const next = { ...prev };
        for (const quote of batch.quotes) {
          const seeded = mergeTicks(next[quote.id], batch.seeds[quote.id] ?? []);
          next[quote.id] = appendQuoteTick(seeded, quote);
        }
        return next;
      });
      let nextRules = rulesRef.current;
      const fired: AlertEvent[] = [];
      for (const quote of batch.quotes) {
        const result = evaluate(quote, nextRules, assetsRef.current);
        nextRules = result.rules;
        fired.push(...result.events);
      }
      rulesRef.current = nextRules;
      setRules(nextRules);
      if (fired.length) {
        setEvents((prev) => [...fired, ...prev].slice(0, 80));
        fired.forEach(notifyBrowser);
      }
    },
    [],
  );

  const poll = useCallback(async () => {
    try {
      const seed = !seededRef.current;
      const batch = await fetchAllQuotes(assetsRef.current, seed);
      if (seed && batch.quotes.length) seededRef.current = true;
      if (!batch.quotes.length) {
        setStatus("error");
        setErrors(batch.errors.length ? batch.errors : ["No quotes returned"]);
        return;
      }
      applyBatch(batch);
      setUpdatedAt(Date.now());
      setErrors(batch.errors);
      setStatus("live");
    } catch (err) {
      setStatus("error");
      setErrors([err instanceof Error ? err.message : "Poll failed"]);
    }
  }, [applyBatch]);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  useEffect(() => {
    saveDesk({
      quotes,
      ticks,
      rules,
      events,
      focusId,
      customAssets,
      hiddenIds,
    });
  }, [quotes, ticks, rules, events, focusId, customAssets, hiddenIds]);

  const addAsset = useCallback(
    async (incoming: Asset) => {
      const existing = findOnDesk(incoming, assetsRef.current);
      if (existing) {
        setFocusId(existing.id);
        return existing.id;
      }
      const defaultMatch = DEFAULT_ASSETS.find((d) => sameAsset(d, incoming));
      if (defaultMatch) {
        setHiddenIds((prev) => prev.filter((id) => id !== defaultMatch.id));
        setFocusId(defaultMatch.id);
        return defaultMatch.id;
      }
      setCustomAssets((prev) => [...prev, incoming]);
      setFocusId(incoming.id);
      try {
        const batch = await fetchAllQuotes([incoming], true);
        applyBatch(batch);
        if (batch.quotes.length) setUpdatedAt(Date.now());
      } catch {
        // Next poll will retry.
      }
      return incoming.id;
    },
    [applyBatch],
  );

  const removeAsset = useCallback((id: string) => {
    const current = assetsRef.current;
    if (current.length <= 1) return;
    if (DEFAULT_IDS.has(id)) {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setCustomAssets((prev) => prev.filter((a) => a.id !== id));
    }
    setFocusId((prev) => {
      if (prev !== id) return prev;
      return current.find((a) => a.id !== id)?.id ?? prev;
    });
    setRules((prev) => {
      const next = prev.filter((r) => r.assetId !== id);
      rulesRef.current = next;
      return next;
    });
  }, []);

  const addRule = useCallback((assetId: string, kind: AlertKind, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    setRules((prev) => {
      const next = [...prev, { id: uid(), assetId, kind, value, enabled: true }];
      rulesRef.current = next;
      return next;
    });
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      rulesRef.current = next;
      return next;
    });
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return {
    assets,
    quotes,
    ticks,
    rules,
    events,
    focusId,
    setFocusId,
    status,
    errors,
    updatedAt,
    flashed,
    addAsset,
    removeAsset,
    addRule,
    removeRule,
    clearEvents,
    poll,
  };
}
