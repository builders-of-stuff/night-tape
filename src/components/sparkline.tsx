import { cx } from "../lib/format";

type Props = {
  points: number[];
  up: boolean;
  className?: string;
};

export function Sparkline({ points, up, className }: Props) {
  if (points.length < 2) {
    return <div className={cx("h-9 w-full", className)} />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 36 - ((p - min) / span) * 32 - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const color = up ? "#d08a4a" : "#8ec8ff";
  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      className={cx("h-9 w-full", className)}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
