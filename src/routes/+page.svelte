<script lang="ts">
  import AssetCard from "$lib/components/asset-card.svelte";
  import FocusPane from "$lib/components/focus-pane.svelte";
  import SearchBar from "$lib/components/search-bar.svelte";
  import TickerTape from "$lib/components/ticker-tape.svelte";
  import { desk } from "$lib/desk.svelte";
  import { POLL_MS } from "$lib/assets";
  import { playTripChime, unlockChime } from "$lib/chime";
  import { formatClock, formatTime, usSession } from "$lib/format";
  import { onMount } from "svelte";

  let now = $state(Date.now());
  let notify = $state(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  let logOpen = $state(false);
  let draggingId = $state<string | null>(null);
  let overId = $state<string | null>(null);

  const focus = $derived(
    desk.assets.find((a) => a.id === desk.focusId) ?? desk.assets[0],
  );
  const session = $derived(usSession(now));
  const toasts = $derived(desk.events.filter((e) => now - e.at < 10_000).slice(0, 3));

  onMount(() => {
    desk.start();
    const unlock = () => unlockChime();
    window.addEventListener("pointerdown", unlock, { once: true });
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => {
      desk.stop();
      window.removeEventListener("pointerdown", unlock);
      clearInterval(id);
    };
  });

  async function enableNotes() {
    unlockChime();
    playTripChime();
    if (typeof Notification === "undefined") return;
    notify = await Notification.requestPermission();
  }

  function dragStart(e: DragEvent, id: string) {
    draggingId = id;
    e.dataTransfer?.setData("text/plain", id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }

  function dragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    overId = id;
  }

  function drop(e: DragEvent, id: string) {
    e.preventDefault();
    const from = e.dataTransfer?.getData("text/plain") || draggingId;
    if (from) desk.moveAsset(from, id);
    draggingId = null;
    overId = null;
  }
</script>

{#if focus}
  <div class="flex min-h-svh flex-col bg-ink text-paper">
    <header class="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
      <div>
        <div class="font-mono text-[10px] uppercase tracking-[0.28em] text-copper">
          local desk
        </div>
        <h1
          class="font-display text-[28px] font-extrabold leading-none tracking-[0.18em]"
        >
          NIGHT TAPE
        </h1>
      </div>
      <div
        class="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-ghost"
      >
        <span class="tabular text-paper">{formatClock(now)}</span>
        <span>US {session}</span>
        <span>
          {#if desk.status === "live"}
            live · {desk.updatedAt ? formatTime(desk.updatedAt) : "polling"}
          {:else if desk.status === "error"}
            feed error
          {:else}
            warming
          {/if}
        </span>
        <span>{POLL_MS / 1000}s poll</span>
        {#if notify !== "granted" && notify !== "unsupported"}
          <button type="button" class="text-lamp hover:underline" onclick={enableNotes}>
            Enable alerts
          </button>
        {/if}
        <button
          type="button"
          class="text-paper hover:text-lamp"
          onclick={() => (logOpen = !logOpen)}
        >
          trips {desk.events.length}
        </button>
      </div>
    </header>

    <SearchBar
      assets={desk.assets}
      onAdd={(asset) => void desk.addAsset(asset)}
      onFocus={(id) => desk.setFocus(id)}
    />

    <TickerTape
      assets={desk.assets}
      quotes={desk.quotes}
      flashed={desk.flashed}
      {now}
    />

    {#if desk.errors.length > 0}
      <div class="border-b border-rule px-5 py-1.5 font-mono text-[11px] text-stamp">
        {desk.errors[0]}
      </div>
    {/if}

    <main
      class="grid flex-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.9fr)]"
    >
      <section
        class="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {#each desk.assets as asset (asset.id)}
          <AssetCard
            {asset}
            quote={desk.quotes[asset.id]}
            ticks={desk.ticks[asset.id] ?? []}
            active={focus.id === asset.id}
            fresh={now - (desk.flashed[asset.id] ?? 0) < 2800}
            dragging={draggingId === asset.id}
            over={overId === asset.id && draggingId !== asset.id}
            onFocus={() => desk.setFocus(asset.id)}
            onRemove={desk.assets.length > 1 && asset.id !== "spx"
              ? () => desk.removeAsset(asset.id)
              : undefined}
            onDragStart={(e) => dragStart(e, asset.id)}
            onDragOver={(e) => dragOver(e, asset.id)}
            onDrop={(e) => drop(e, asset.id)}
            onDragEnd={() => {
              draggingId = null;
              overId = null;
            }}
          />
        {/each}
      </section>
      <FocusPane
        asset={focus}
        quote={desk.quotes[focus.id]}
        ticks={desk.ticks[focus.id] ?? []}
        rules={desk.rules}
        onAddRule={(kind, value) => desk.addRule(focus.id, kind, value)}
        onRemoveRule={(id) => desk.removeRule(id)}
        onDrop={desk.assets.length > 1 && focus.id !== "spx"
          ? () => desk.removeAsset(focus.id)
          : undefined}
      />
    </main>

    {#if logOpen}
      <section class="border-t border-rule bg-blotter px-5 py-3">
        <div
          class="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ghost"
        >
          <span>Trip log</span>
          <button type="button" class="text-stamp" onclick={() => desk.clearEvents()}>
            clear
          </button>
        </div>
        {#if desk.events.length === 0}
          <p class="text-sm text-ghost">Quiet. Nothing has tripped yet.</p>
        {:else}
          <ul class="space-y-1 font-mono text-xs">
            {#each desk.events.slice(0, 12) as event (event.id)}
              <li class="flex gap-3">
                <span class="text-ghost">{formatTime(event.at)}</span>
                <span>{event.message}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    <div
      class="pointer-events-none fixed top-20 right-4 z-20 flex w-[min(100%-2rem,360px)] flex-col gap-2"
    >
      {#each toasts as event (event.id)}
        <div
          class="pointer-events-auto border border-lamp bg-panel px-3 py-2 font-mono text-xs text-lamp shadow-[0_0_24px_rgba(255,224,138,0.16)]"
        >
          {event.message}
        </div>
      {/each}
    </div>
  </div>
{/if}
