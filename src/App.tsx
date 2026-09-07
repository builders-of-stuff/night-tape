import { useEffect, useMemo, useState } from "react";
import { AssetCard } from "./components/asset-card";
import { FocusPane } from "./components/focus-pane";
import { SearchBar } from "./components/search-bar";
import { TickerTape } from "./components/ticker-tape";
import { useDesk } from "./hooks/use-desk";
import { POLL_MS } from "./lib/assets";
import { formatClock, formatTime, usSession } from "./lib/format";

export default function App() {
  const desk = useDesk();
  const [now, setNow] = useState(() => Date.now());
  const [notify, setNotify] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [logOpen, setLogOpen] = useState(false);
  const focus = desk.assets.find((a) => a.id === desk.focusId) ?? desk.assets[0];
  const session = usSession(now);
  const toasts = useMemo(
    () => desk.events.filter((e) => now - e.at < 10_000).slice(0, 3),
    [desk.events, now],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function enableNotes() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotify(perm);
  }

  if (!focus) return null;

  return (
    <div className="flex min-h-svh flex-col bg-ink text-paper">
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-copper">
            local desk
          </div>
          <h1 className="font-display text-[28px] font-extrabold leading-none tracking-[0.18em]">
            NIGHT TAPE
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-ghost">
          <span className="tabular text-paper">{formatClock(now)}</span>
          <span>US {session}</span>
          <span>
            {desk.status === "live"
              ? `live · ${desk.updatedAt ? formatTime(desk.updatedAt) : "polling"}`
              : desk.status === "error"
                ? "feed error"
                : "warming"}
          </span>
          <span>{POLL_MS / 1000}s poll</span>
          {notify !== "granted" && notify !== "unsupported" && (
            <button
              type="button"
              onClick={() => void enableNotes()}
              className="text-lamp hover:underline"
            >
              Enable alerts
            </button>
          )}
          <button
            type="button"
            onClick={() => setLogOpen((v) => !v)}
            className="text-paper hover:text-lamp"
          >
            trips {desk.events.length}
          </button>
        </div>
      </header>

      <SearchBar
        assets={desk.assets}
        onAdd={(asset) => void desk.addAsset(asset)}
        onFocus={desk.setFocusId}
      />

      <TickerTape
        assets={desk.assets}
        quotes={desk.quotes}
        flashed={desk.flashed}
        now={now}
      />

      {desk.errors.length > 0 && (
        <div className="border-b border-rule px-5 py-1.5 font-mono text-[11px] text-stamp">
          {desk.errors[0]}
        </div>
      )}

      <main className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.9fr)]">
        <section className="grid min-h-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {desk.assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              quote={desk.quotes[asset.id]}
              ticks={desk.ticks[asset.id] ?? []}
              active={focus.id === asset.id}
              fresh={now - (desk.flashed[asset.id] ?? 0) < 2800}
              onFocus={() => desk.setFocusId(asset.id)}
              onRemove={
                desk.assets.length > 1 ? () => desk.removeAsset(asset.id) : undefined
              }
            />
          ))}
        </section>
        <FocusPane
          asset={focus}
          quote={desk.quotes[focus.id]}
          ticks={desk.ticks[focus.id] ?? []}
          rules={desk.rules}
          onAddRule={(kind, value) => desk.addRule(focus.id, kind, value)}
          onRemoveRule={desk.removeRule}
          onDrop={desk.assets.length > 1 ? () => desk.removeAsset(focus.id) : undefined}
        />
      </main>

      {logOpen && (
        <section className="border-t border-rule bg-blotter px-5 py-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ghost">
            <span>Trip log</span>
            <button type="button" onClick={desk.clearEvents} className="text-stamp">
              clear
            </button>
          </div>
          {desk.events.length === 0 ? (
            <p className="text-sm text-ghost">Quiet. Nothing has tripped yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {desk.events.slice(0, 12).map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="text-ghost">{formatTime(event.at)}</span>
                  <span>{event.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="pointer-events-none fixed right-4 top-20 z-20 flex w-[min(100%-2rem,360px)] flex-col gap-2">
        {toasts.map((event) => (
          <div
            key={event.id}
            className="pointer-events-auto border border-lamp bg-panel px-3 py-2 font-mono text-xs text-lamp shadow-[0_0_24px_rgba(255,224,138,0.16)]"
          >
            {event.message}
          </div>
        ))}
      </div>
    </div>
  );
}
