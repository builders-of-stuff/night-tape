import {
  ALERT_COOLDOWN_MS,
  DEFAULT_ASSETS,
  DEFAULT_IDS,
  PINNED_IDS,
  POLL_MS,
} from "./assets";
import { formatPct, formatPrice } from "./format";
import { fetchAllQuotes } from "./quotes";
import { appendQuoteTick, loadDesk, mergeTicks, saveDesk, uid } from "./storage";
import type { AlertEvent, AlertKind, AlertRule, Asset, Quote, Tick } from "./types";
import { playTripChime } from "./chime";
import { composeWatchlist, findOnDesk, sameAsset } from "./watchlist";

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

class Desk {
  quotes = $state<Record<string, Quote>>({});
  ticks = $state<Record<string, Tick[]>>({});
  rules = $state<AlertRule[]>([]);
  events = $state<AlertEvent[]>([]);
  focusId = $state("btc");
  customAssets = $state<Asset[]>([]);
  hiddenIds = $state<string[]>([]);
  order = $state<string[]>([]);
  status = $state<"live" | "error" | "idle">("idle");
  errors = $state<string[]>([]);
  updatedAt = $state<number | null>(null);
  flashed = $state<Record<string, number>>({});
  seeded = false;
  timer: ReturnType<typeof setInterval> | null = null;

  assets = $derived(composeWatchlist(this.customAssets, this.hiddenIds, this.order));

  constructor() {
    const initial = loadDesk();
    this.quotes = initial.quotes;
    this.ticks = initial.ticks;
    this.rules = initial.rules;
    this.events = initial.events;
    this.focusId = initial.focusId;
    this.customAssets = initial.customAssets;
    this.hiddenIds = initial.hiddenIds;
    this.order = initial.order;
    this.updatedAt = Object.values(initial.quotes)[0]?.asOf ?? null;
  }

  persist() {
    saveDesk({
      quotes: this.quotes,
      ticks: this.ticks,
      rules: this.rules,
      events: this.events,
      focusId: this.focusId,
      customAssets: this.customAssets,
      hiddenIds: this.hiddenIds,
      order: this.order,
    });
  }

  applyBatch(batch: Awaited<ReturnType<typeof fetchAllQuotes>>) {
    const flash: Record<string, number> = {};
    const nextQuotes = { ...this.quotes };
    const nextTicks = { ...this.ticks };
    for (const quote of batch.quotes) {
      const prior = nextQuotes[quote.id];
      if (prior && prior.price !== quote.price) flash[quote.id] = Date.now();
      nextQuotes[quote.id] = quote;
      const seeded = mergeTicks(nextTicks[quote.id], batch.seeds[quote.id] ?? []);
      nextTicks[quote.id] = appendQuoteTick(seeded, quote);
    }
    this.quotes = nextQuotes;
    this.ticks = nextTicks;
    if (Object.keys(flash).length) {
      this.flashed = { ...this.flashed, ...flash };
    }

    let nextRules = this.rules;
    const fired: AlertEvent[] = [];
    for (const quote of batch.quotes) {
      const result = evaluate(quote, nextRules, this.assets);
      nextRules = result.rules;
      fired.push(...result.events);
    }
    this.rules = nextRules;
    if (fired.length) {
      this.events = [...fired, ...this.events].slice(0, 80);
      fired.forEach(notifyBrowser);
      playTripChime();
    }
    this.persist();
  }

  async poll() {
    try {
      const seed = !this.seeded;
      const batch = await fetchAllQuotes(this.assets, seed);
      if (seed && batch.quotes.length) this.seeded = true;
      if (!batch.quotes.length) {
        this.status = "error";
        this.errors = batch.errors.length ? batch.errors : ["No quotes returned"];
        return;
      }
      this.applyBatch(batch);
      this.updatedAt = Date.now();
      this.errors = batch.errors;
      this.status = "live";
    } catch (err) {
      this.status = "error";
      this.errors = [err instanceof Error ? err.message : "Poll failed"];
    }
  }

  start() {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setFocus(id: string) {
    this.focusId = id;
    this.persist();
  }

  async addAsset(incoming: Asset) {
    const existing = findOnDesk(incoming, this.assets);
    if (existing) {
      this.setFocus(existing.id);
      return existing.id;
    }
    const defaultMatch = DEFAULT_ASSETS.find((d) => sameAsset(d, incoming));
    if (defaultMatch) {
      this.hiddenIds = this.hiddenIds.filter((id) => id !== defaultMatch.id);
      this.setFocus(defaultMatch.id);
      return defaultMatch.id;
    }
    this.customAssets = [...this.customAssets, incoming];
    this.order = [...this.assets.map((a) => a.id)];
    this.focusId = incoming.id;
    this.persist();
    try {
      const batch = await fetchAllQuotes([incoming], true);
      this.applyBatch(batch);
      if (batch.quotes.length) this.updatedAt = Date.now();
    } catch {
      // Next poll will retry.
    }
    return incoming.id;
  }

  removeAsset(id: string) {
    if (PINNED_IDS.has(id)) return;
    if (this.assets.length <= 1) return;
    const remaining = this.assets.filter((a) => a.id !== id);
    if (DEFAULT_IDS.has(id)) {
      this.hiddenIds = this.hiddenIds.includes(id)
        ? this.hiddenIds
        : [...this.hiddenIds, id];
    } else {
      this.customAssets = this.customAssets.filter((a) => a.id !== id);
    }
    this.order = this.order.filter((item) => item !== id);
    if (this.focusId === id) {
      this.focusId = remaining[0]?.id ?? this.focusId;
    }
    this.rules = this.rules.filter((r) => r.assetId !== id);
    this.persist();
  }

  moveAsset(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ids = this.assets.map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    this.order = ids;
    this.persist();
  }

  addRule(assetId: string, kind: AlertKind, value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.rules = [...this.rules, { id: uid(), assetId, kind, value, enabled: true }];
    this.persist();
  }

  removeRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
    this.persist();
  }

  clearEvents() {
    this.events = [];
    this.persist();
  }
}

export const desk = new Desk();
