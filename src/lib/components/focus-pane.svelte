<script lang="ts">
  import LiveChart from "$lib/components/live-chart.svelte";
  import LocalChart, { type Range } from "$lib/components/local-chart.svelte";
  import { formatPct, formatPrice, kindLabel } from "$lib/format";
  import type { AlertKind, AlertRule, Asset, Quote, Tick } from "$lib/types";

  let {
    asset,
    quote,
    ticks,
    rules,
    onAddRule,
    onRemoveRule,
    onDrop,
  }: {
    asset: Asset;
    quote?: Quote;
    ticks: Tick[];
    rules: AlertRule[];
    onAddRule: (kind: AlertKind, value: number) => void;
    onRemoveRule: (id: string) => void;
    onDrop?: () => void;
  } = $props();

  let tab = $state<"full" | "tape">("full");
  let range = $state<Range>("1D");
  let kind = $state<AlertKind>("above");
  let value = $state("");

  const up = $derived((quote?.changePct ?? 0) >= 0);
  const mine = $derived(rules.filter((r) => r.assetId === asset.id));
  const links = $derived.by(() => {
    const extra = quote?.pairUrl ? [{ label: "This pool", href: quote.pairUrl }] : [];
    const seen = new Set<string>();
    return [...extra, ...asset.links].filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });
  });

  function arm(e: SubmitEvent) {
    e.preventDefault();
    onAddRule(kind, Number(value));
    value = "";
  }
</script>

<aside class="flex min-h-0 flex-col border border-rule bg-blotter">
  <header class="border-b border-rule px-4 py-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
          {kindLabel(asset.kind)} blotter
        </div>
        <h2 class="mt-1 font-display text-2xl font-extrabold tracking-wide">
          {asset.symbol}
          <span class="ml-2 text-base font-semibold tracking-normal text-ghost">
            {asset.name}
          </span>
        </h2>
      </div>
      <div class="text-right">
        <div class="font-mono text-2xl tabular">
          {quote ? `$${formatPrice(quote.price)}` : "—"}
        </div>
        <div class="font-mono text-sm tabular {up ? 'text-copper' : 'text-frost'}">
          {formatPct(quote?.changePct)}
        </div>
      </div>
    </div>
  </header>

  <div class="flex items-center justify-between gap-2 border-b border-rule px-2 py-1">
    <div class="flex">
      <button
        type="button"
        class="px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] {tab ===
        'full'
          ? 'text-lamp'
          : 'text-ghost'}"
        onclick={() => (tab = "full")}
      >
        Full chart
      </button>
      <button
        type="button"
        class="px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] {tab ===
        'tape'
          ? 'text-lamp'
          : 'text-ghost'}"
        onclick={() => (tab = "tape")}
      >
        Short tape
      </button>
    </div>
    {#if tab === "tape"}
      <div class="flex gap-1">
        {#each ["1H", "4H", "1D", "7D"] as r (r)}
          <button
            type="button"
            class="px-2 py-1 font-mono text-[10px] tracking-wider {range === r
              ? 'text-lamp'
              : 'text-ghost'}"
            onclick={() => (range = r as Range)}
          >
            {r}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="h-[min(52vh,520px)] min-h-[280px] bg-ink">
    {#if tab === "full"}
      <LiveChart {asset} {quote} />
    {:else}
      <LocalChart {ticks} {up} {range} />
    {/if}
  </div>

  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-4 py-2 font-mono text-[11px]"
  >
    {#each links as link (link.href)}
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        class="text-copper underline-offset-4 hover:text-lamp hover:underline"
      >
        {link.label} ↗
      </a>
    {/each}
    {#if onDrop}
      <button
        type="button"
        class="ml-auto text-ghost hover:text-stamp"
        onclick={onDrop}
      >
        Drop from desk
      </button>
    {/if}
  </div>

  <div class="border-t border-rule px-4 py-3">
    <div class="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
      Tripwires
    </div>
    <form class="mt-2 flex flex-wrap items-center gap-2" onsubmit={arm}>
      <select
        bind:value={kind}
        class="border border-rule bg-ink px-2 py-1.5 font-mono text-xs text-paper"
      >
        <option value="above">price above</option>
        <option value="below">price below</option>
        <option value="move">|session move| ≥ %</option>
      </select>
      <input
        bind:value
        inputmode="decimal"
        placeholder={kind === "move" ? "5" : formatPrice(quote?.price)}
        class="w-28 border border-rule bg-ink px-2 py-1.5 font-mono text-xs text-paper"
      />
      <button
        type="submit"
        class="border border-copper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-copper hover:bg-copper hover:text-ink"
      >
        Arm {asset.symbol}
      </button>
    </form>
    <div class="mt-2 flex flex-wrap gap-2">
      {#if mine.length === 0}
        <p class="text-xs text-ghost">
          No trips. Arm a level and it fires here plus as a desktop notification.
        </p>
      {/if}
      {#each mine as rule (rule.id)}
        <button
          type="button"
          class="border border-rule px-2 py-1 font-mono text-[11px] text-paper hover:border-stamp hover:text-stamp"
          title="Remove"
          onclick={() => onRemoveRule(rule.id)}
        >
          {rule.kind === "move"
            ? `±${rule.value}%`
            : `${rule.kind} ${formatPrice(rule.value)}`} ×
        </button>
      {/each}
    </div>
  </div>
</aside>
