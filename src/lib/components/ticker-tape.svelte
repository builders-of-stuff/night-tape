<script lang="ts">
  import { cx, formatPct, formatPrice } from "$lib/format";
  import type { Asset, Quote } from "$lib/types";

  let {
    assets,
    quotes,
    flashed,
    now,
  }: {
    assets: Asset[];
    quotes: Record<string, Quote>;
    flashed: Record<string, number>;
    now: number;
  } = $props();
</script>

{#snippet prints(lane: string)}
  {#each assets as asset (lane + asset.id)}
    {@const quote = quotes[asset.id]}
    {@const up = (quote?.changePct ?? 0) >= 0}
    {@const fresh = now - (flashed[asset.id] ?? 0) < 2800}
    <span
      class="mx-6 inline-flex items-baseline gap-3 font-mono text-[13px] tracking-wide"
    >
      <span class="text-ghost">{asset.symbol}</span>
      <span class={cx("tabular text-paper", fresh && "print-fresh")}>
        {quote ? `$${formatPrice(quote.price)}` : "—"}
      </span>
      <span class={cx("tabular", up ? "text-copper" : "text-frost")}>
        {quote ? formatPct(quote.changePct) : ""}
      </span>
    </span>
  {/each}
{/snippet}

<div class="tape-rail relative overflow-hidden border-y border-rule">
  <div
    class="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#14110d] to-transparent"
  ></div>
  <div
    class="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#14110d] to-transparent"
  ></div>
  <div class="tape-track whitespace-nowrap py-2.5 pl-10 pr-10">
    <div class="flex items-center">{@render prints("a")}</div>
    <div class="flex items-center" aria-hidden="true">{@render prints("b")}</div>
  </div>
</div>
