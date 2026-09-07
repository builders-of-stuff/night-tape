import { DEFAULT_ASSETS } from "./assets";
import type { Asset } from "./types";

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
  return false;
}

export function findOnDesk(asset: Asset, desk: Asset[]): Asset | undefined {
  return desk.find((row) => sameAsset(row, asset));
}

export function composeWatchlist(custom: Asset[], hiddenIds: string[]): Asset[] {
  const hidden = new Set(hiddenIds);
  const defaults = DEFAULT_ASSETS.filter((a) => !hidden.has(a.id));
  const extras = custom.filter((row) => !defaults.some((d) => sameAsset(d, row)));
  return [...defaults, ...extras];
}
