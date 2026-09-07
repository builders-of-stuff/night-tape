import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { Tick } from "../lib/types";

type Range = "1H" | "4H" | "1D" | "7D";

type Props = {
  ticks: Tick[];
  up: boolean;
  range: Range;
};

const WINDOW: Record<Range, number> = {
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
};

export function LocalChart({ ticks, up, range }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a7",
        fontFamily: "Azeret Mono, ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(42,49,72,0.45)" },
        horzLines: { color: "rgba(42,49,72,0.45)" },
      },
      rightPriceScale: { borderColor: "#2a3148" },
      timeScale: {
        borderColor: "#2a3148",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: true,
      handleScale: true,
    });
    const series = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      lineColor: "#d08a4a",
      topColor: "rgba(208,138,74,0.28)",
      bottomColor: "rgba(10,12,20,0)",
      priceLineVisible: true,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    series.applyOptions({
      lineColor: up ? "#d08a4a" : "#8ec8ff",
      topColor: up ? "rgba(208,138,74,0.28)" : "rgba(142,200,255,0.22)",
    });
    chart.timeScale().applyOptions({ secondsVisible: range === "1H" });
    const cutoff = Date.now() - WINDOW[range];
    const sliced = ticks.filter((t) => t.t >= cutoff);
    const data = (sliced.length >= 2 ? sliced : ticks).map((t) => ({
      time: Math.floor(t.t / 1000) as UTCTimestamp,
      value: t.p,
    }));
    series.setData(data);
    chart.timeScale().fitContent();
  }, [ticks, up, range]);

  if (ticks.length < 2) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-xs text-ghost">
        Collecting short tape in this browser…
      </div>
    );
  }

  return <div ref={host} className="h-full w-full" />;
}

export type { Range };
