<script lang="ts">
  import Sparkline from "$lib/components/sparkline.svelte";
  import {
    formatCompact,
    formatPct,
    formatPrice,
    kindLabel,
    sessionLabel,
  } from "$lib/format";
  import type { Asset, Quote, Tick } from "$lib/types";

  let {
    asset,
    quote,
    ticks,
    active,
    fresh,
    dragging,
    over,
    onFocus,
    onRemove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }: {
    asset: Asset;
    quote?: Quote;
    ticks: Tick[];
    active: boolean;
    fresh: boolean;
    dragging: boolean;
    over: boolean;
    onFocus: () => void;
    onRemove?: () => void;
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onDragEnd: () => void;
  } = $props();

  const up = $derived((quote?.changePct ?? 0) >= 0);
  const spark = $derived(ticks.slice(-80).map((t) => t.p));
  const windows = $derived(quote?.windows);
  let dragged = false;

  function click() {
    if (dragged) {
      dragged = false;
      return;
    }
    onFocus();
  }
</script>

<div
  class="bay relative flex h-full w-full flex-col {active ? 'bay-live' : ''} {dragging
    ? 'bay-dragging'
    : ''} {over ? 'bay-over' : ''}"
  role="group"
  aria-label="{asset.symbol} {asset.name}"
  draggable="true"
  ondragstart={(e) => {
    dragged = true;
    onDragStart(e);
  }}
  ondragover={onDragOver}
  ondrop={onDrop}
  ondragend={onDragEnd}
>
  <div
    class="pointer-events-none absolute left-2 top-2 z-10 font-mono text-[10px] leading-none tracking-widest text-ghost"
    aria-hidden="true"
  >
    ⋮⋮
  </div>
  {#if onRemove}
    <button
      type="button"
      draggable="false"
      class="absolute right-2 top-2 z-10 px-1.5 font-mono text-[11px] text-ghost hover:text-stamp"
      title="Drop {asset.symbol}"
      aria-label="Drop {asset.symbol}"
      onclick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
    >
      ×
    </button>
  {/if}
  <div
    class="flex h-full w-full cursor-grab flex-col p-3.5 pr-7 pl-7 text-left active:cursor-grabbing"
    role="button"
    tabindex="0"
    onclick={click}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        click();
      }
    }}
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="font-display text-lg font-extrabold tracking-wide text-paper">
          {asset.symbol}
        </div>
        <div class="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-ghost">
          {asset.name}
        </div>
      </div>
      <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
        {kindLabel(asset.kind)} · {sessionLabel(asset.kind)}
      </span>
    </div>

    <div class="mt-3 flex items-end justify-between gap-3">
      <div>
        <div
          class="font-mono text-[26px] font-medium leading-none tabular {fresh
            ? 'print-fresh'
            : 'text-paper'}"
        >
          {quote ? `$${formatPrice(quote.price)}` : "—"}
        </div>
        <div
          class="mt-1.5 font-mono text-[13px] tabular {up
            ? 'text-copper'
            : 'text-frost'}"
        >
          {up ? "▲" : "▼"}
          {formatPct(quote?.changePct)}
        </div>
      </div>
      <div class="w-[42%] min-w-24">
        {#if spark.length >= 2}
          <Sparkline points={spark} {up} />
        {:else}
          <div
            class="flex h-9 items-end justify-end font-mono text-[10px] uppercase tracking-wider text-ghost"
          >
            collecting
          </div>
        {/if}
      </div>
    </div>

    {#if asset.kind === "dex" && windows}
      <div
        class="mt-3 grid grid-cols-4 gap-1 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-wider text-ghost"
      >
        {#each ["m5", "h1", "h6", "h24"] as key (key)}
          {@const n = windows[key as "m5" | "h1" | "h6" | "h24"]}
          <div>
            <div>{key}</div>
            <div class={(n ?? 0) >= 0 ? "text-copper" : "text-frost"}>
              {formatPct(n)}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div
        class="mt-3 flex gap-4 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-wider text-ghost"
      >
        {#if quote?.marketCap != null}
          <span>mcap {formatCompact(quote.marketCap)}</span>
        {/if}
        {#if quote?.volume != null}
          <span>vol {formatCompact(quote.volume)}</span>
        {/if}
        {#if quote?.liquidity != null}
          <span>liq {formatCompact(quote.liquidity)}</span>
        {/if}
        {#if quote?.dayLow != null && quote.dayHigh != null}
          <span>{formatPrice(quote.dayLow)}–{formatPrice(quote.dayHigh)}</span>
        {/if}
        {#if quote}
          <span class="ml-auto normal-case tracking-normal">{quote.source}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>
