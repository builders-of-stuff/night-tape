<script lang="ts">
  import { cx } from "$lib/format";

  let { points, up, className }: { points: number[]; up: boolean; className?: string } =
    $props();

  const d = $derived.by(() => {
    if (points.length < 2) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 36 - ((p - min) / span) * 32 - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  });
</script>

{#if points.length < 2}
  <div class={cx("h-9 w-full", className)}></div>
{:else}
  <svg
    viewBox="0 0 100 36"
    preserveAspectRatio="none"
    class={cx("h-9 w-full", className)}
    aria-hidden="true"
  >
    <path
      {d}
      fill="none"
      stroke={up ? "#d08a4a" : "#8ec8ff"}
      stroke-width="1.6"
      vector-effect="non-scaling-stroke"
    />
  </svg>
{/if}
