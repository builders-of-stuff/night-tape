import { DEFAULT_ASSETS, PINNED_IDS } from "./assets";
import type { Asset } from "./types";

function spxLike(asset: Asset): boolean {
  const blob = [
    asset.id,
    asset.symbol,
    asset.name,
    asset.cnbcSymbol,
    asset.yahooSymbol,
    asset.tradingView,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    /\bspx\b/.test(blob) ||
    blob.includes(".spx") ||
    blob.includes("^gspc") ||
    blob.includes("s&p 500") ||
    blob.includes("s&p500") ||
    blob.includes("forexcom:spxusd")
  );
}

export function sameAsset(a: Asset, b: Asset): boolean {
  if (a.id === b.id) return true;
  if (a.geckoId && a.geckoId === b.geckoId) return true;
  if (
    a.tokenAddress &&
    b.tokenAddress &&
    a.tokenAddress.toLowerCase() === b.tokenAddress.toLowerCase()
  ) {
    return true;
  }
  if (a.yahooSymbol && a.yahooSymbol === b.yahooSymbol) return true;
  if (a.cnbcSymbol && a.cnbcSymbol === b.cnbcSymbol) return true;
  if (spxLike(a) && spxLike(b)) return true;
  return false;
}

export function findOnDesk(asset: Asset, desk: Asset[]): Asset | undefined {
  return desk.find((row) => sameAsset(row, asset));
}

export function composeWatchlist(
  custom: Asset[],
  hiddenIds: string[],
  order: string[] = [],
): Asset[] {
  const hidden = new Set([...hiddenIds].filter((id) => !PINNED_IDS.has(id)));
  const defaults = DEFAULT_ASSETS.filter((a) => !hidden.has(a.id));
  const extras = custom.filter((row) => !defaults.some((d) => sameAsset(d, row)));
  const list = [...defaults, ...extras];
  if (!order.length) return list;
  const byId = new Map(list.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const sorted: Asset[] = [];
  for (const id of order) {
    const asset = byId.get(id);
    if (!asset || seen.has(id)) continue;
    sorted.push(asset);
    seen.add(id);
  }
  for (const asset of list) {
    if (!seen.has(asset.id)) sorted.push(asset);
  }
  return sorted;
}
