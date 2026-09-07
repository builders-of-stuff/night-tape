export type AssetKind = "crypto" | "dex" | "equity" | "index";

export type AssetLink = {
  label: string;
  href: string;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  geckoId?: string;
  yahooSymbol?: string;
  cnbcSymbol?: string;
  tokenAddress?: string;
  chain?: string;
  tradingView?: string;
  dexEmbed?: string;
  links: AssetLink[];
};

export type Quote = {
  id: string;
  price: number;
  changePct: number;
  changeAbs: number;
  marketCap?: number;
  volume?: number;
  liquidity?: number;
  dayLow?: number;
  dayHigh?: number;
  windows?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  source: string;
  asOf: number;
  pairAddress?: string;
  pairUrl?: string;
};

export type Tick = {
  t: number;
  p: number;
};

export type AlertKind = "above" | "below" | "move";

export type AlertRule = {
  id: string;
  assetId: string;
  kind: AlertKind;
  value: number;
  enabled: boolean;
  lastFiredAt?: number;
};

export type AlertEvent = {
  id: string;
  ruleId: string;
  assetId: string;
  message: string;
  at: number;
  price: number;
};

export type DeskState = {
  quotes: Record<string, Quote>;
  ticks: Record<string, Tick[]>;
  rules: AlertRule[];
  events: AlertEvent[];
  focusId: string;
  customAssets: Asset[];
  hiddenIds: string[];
};
