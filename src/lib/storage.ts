import { DEFAULT_ASSETS, STORAGE_KEY, TICK_CAP } from "./assets";
import type { AlertEvent, AlertRule, DeskState, Quote, Tick } from "./types";

const empty = (): DeskState => ({
  quotes: {},
  ticks: {},
  rules: [],
  events: [],
  focusId: DEFAULT_ASSETS[0]?.id ?? "btc",
  customAssets: [],
  hiddenIds: [],
  order: [],
});

export function loadDesk(): DeskState {
  if (typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<DeskState>;
    return {
      quotes: parsed.quotes ?? {},
      ticks: parsed.ticks ?? {},
      rules: parsed.rules ?? [],
      events: (parsed.events ?? []).slice(0, 80),
      focusId: parsed.focusId ?? empty().focusId,
      customAssets: parsed.customAssets ?? [],
      hiddenIds: (parsed.hiddenIds ?? []).filter((id) => id !== "spx"),
      order: promoteSpx(parsed.order ?? []),
    };
  } catch {
    return empty();
  }
}

export function saveDesk(state: DeskState) {
  try {
    const slim: DeskState = {
      ...state,
      ticks: Object.fromEntries(
        Object.entries(state.ticks).map(([id, ticks]) => [id, ticks.slice(-TICK_CAP)]),
      ),
      events: state.events.slice(0, 80),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Quota or private mode — the desk still runs in memory.
  }
}

function promoteSpx(order: string[]): string[] {
  if (!order.includes("spx")) return order;
  const next = order.filter((id) => id !== "spx");
  const btc = next.indexOf("btc");
  next.splice(btc >= 0 ? btc + 1 : 0, 0, "spx");
  return next;
}

export function mergeTicks(existing: Tick[] = [], incoming: Tick[] = []): Tick[] {
  const map = new Map<number, number>();
  for (const tick of [...incoming, ...existing]) {
    if (!Number.isFinite(tick.p) || !Number.isFinite(tick.t)) continue;
    const sec = Math.floor(tick.t / 1000) * 1000;
    map.set(sec, tick.p);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, p]) => ({ t, p }))
    .slice(-TICK_CAP);
}

export function appendQuoteTick(ticks: Tick[], quote: Quote): Tick[] {
  const last = ticks.at(-1);
  if (last && last.p === quote.price && quote.asOf - last.t < 60_000) return ticks;
  return mergeTicks(ticks, [{ t: quote.asOf, p: quote.price }]);
}

export function uid(): string {
  return crypto.randomUUID();
}

export type { AlertEvent, AlertRule, Quote, Tick };
