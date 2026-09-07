<script lang="ts">
  import type { Asset } from "$lib/types";
  import { findOnDesk } from "$lib/watchlist";
  import {
    isTickerQuery,
    searchMarkets,
    type SearchGroup,
    type SearchHit,
  } from "$lib/search";

  let {
    assets,
    onAdd,
    onFocus,
  }: {
    assets: Asset[];
    onAdd: (asset: Asset) => void;
    onFocus: (id: string) => void;
  } = $props();

  const LABELS: Record<SearchGroup, string> = {
    coin: "Coins",
    dex: "Dex",
    stock: "Stocks & funds",
  };

  let query = $state("");
  let open = $state(false);
  let hits = $state<SearchHit[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let active = $state(0);
  let box = $state<HTMLDivElement | undefined>();
  let input = $state<HTMLInputElement | undefined>();

  const groupOrder = $derived<SearchGroup[]>(
    isTickerQuery(query) ? ["stock", "coin", "dex"] : ["coin", "dex", "stock"],
  );
  const groups = $derived(
    groupOrder
      .map((group) => ({
        group,
        rows: hits
          .map((hit, index) => ({ hit, index }))
          .filter((row) => row.hit.group === group),
      }))
      .filter((g) => g.rows.length),
  );

  $effect(() => {
    const q = query.trim();
    if (q.length < 1) {
      hits = [];
      loading = false;
      error = null;
      return;
    }
    loading = true;
    const handle = window.setTimeout(() => {
      void searchMarkets(q)
        .then((rows) => {
          hits = rows;
          active = 0;
          error = rows.length ? null : "Nothing matched.";
        })
        .catch(() => {
          hits = [];
          error = "Search failed. Try again in a moment.";
        })
        .finally(() => {
          loading = false;
        });
    }, 280);
    return () => window.clearTimeout(handle);
  });

  $effect(() => {
    function onDoc(e: MouseEvent) {
      if (!box?.contains(e.target as Node)) open = false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !inField(e.target)) {
        e.preventDefault();
        input?.focus();
        open = true;
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  });

  function pick(hit: SearchHit) {
    const existing = findOnDesk(hit.asset, assets);
    if (existing) onFocus(existing.id);
    else onAdd(hit.asset);
    query = "";
    hits = [];
    open = false;
    input?.blur();
  }

  function onKeys(e: KeyboardEvent) {
    if (e.key === "Escape") {
      open = false;
      input?.blur();
      return;
    }
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = (active + 1) % hits.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = (active - 1 + hits.length) % hits.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) pick(hit);
    }
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
</script>

<div bind:this={box} class="relative px-5 pb-3">
  <label class="sr-only" for="tape-add">Add a name</label>
  <div
    class="flex items-center gap-3 border border-rule bg-blotter px-3 py-2 focus-within:border-copper"
  >
    <span class="font-mono text-[10px] uppercase tracking-[0.22em] text-copper"
      >add</span
    >
    <input
      id="tape-add"
      bind:this={input}
      bind:value={query}
      oninput={() => (open = true)}
      onfocus={() => (open = true)}
      onkeydown={onKeys}
      placeholder="Search coins, tickers, or a mint — / to focus"
      class="w-full bg-transparent font-mono text-sm text-paper outline-none placeholder:text-ghost"
      autocomplete="off"
      spellcheck="false"
      role="combobox"
      aria-expanded={open}
      aria-controls="tape-add-list"
    />
    {#if loading}
      <span class="font-mono text-[10px] uppercase tracking-wider text-ghost">
        hunting
      </span>
    {/if}
  </div>

  {#if open && query.trim()}
    <div
      id="tape-add-list"
      role="listbox"
      class="absolute right-5 left-5 z-30 mt-1 max-h-[min(60vh,420px)] overflow-auto border border-rule bg-panel shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
    >
      {#if error && !hits.length}
        <p class="px-3 py-3 font-mono text-xs text-ghost">{error}</p>
      {/if}
      {#each groups as { group, rows } (group)}
        <div>
          <div
            class="sticky top-0 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-copper"
          >
            {LABELS[group]}
          </div>
          {#each rows as { hit, index } (hit.key)}
            {@const onDesk = Boolean(findOnDesk(hit.asset, assets))}
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left {index ===
              active
                ? 'bg-blotter'
                : ''}"
              onmouseenter={() => (active = index)}
              onclick={() => pick(hit)}
            >
              <span class="min-w-0">
                <span class="font-display text-sm font-bold tracking-wide">
                  {hit.asset.symbol}
                </span>
                <span class="ml-2 text-sm text-ghost">{hit.asset.name}</span>
              </span>
              <span
                class="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ghost"
              >
                {onDesk ? "on tape" : hit.detail}
              </span>
            </button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>
