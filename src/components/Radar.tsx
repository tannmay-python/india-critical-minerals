// A mineral's ten scores as one shape, with its group's average drawn behind it for comparison.
import type { CSSProperties } from "react";
import type { VectorDef } from "../data/types";

export const SHORT_VECTOR: Record<string, string> = {
  demand: "Demand", growth: "Growth", end_use: "End use", supplier_concentration: "Supplier concentration",
  reserves: "Reserves", substitutability_recyclability: "Substitutes, recycling", extraction_refining: "Extraction complexity",
  upcoming_projects: "Upcoming projects", india_position: "India's position", price_volatility: "Price volatility",
};

interface Props {
  vectors: VectorDef[];
  /** each series: label, colour and one value per vector as a share of that vector's maximum */
  series: { label: string; color: string; values: number[]; fill?: boolean }[];
  size?: number;
  labels?: boolean;
}

export function Radar({ vectors, series, size = 320, labels = true }: Props) {
  const pad = labels ? 118 : 4;
  const w = size + pad * 2, h = size + (labels ? 84 : 8);
  const cx = w / 2, cy = h / 2, r = size / 2;
  const n = vectors.length;
  const at = (i: number, t: number): [number, number] => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t];
  };
  const ring = (t: number) => vectors.map((_, i) => at(i, t).join(",")).join(" ");
  return (
    <svg className="radar" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img"
      aria-label={series.map((s) => `${s.label}: ${vectors.map((v, i) => `${v.name} ${Math.round(s.values[i] * v.max * 10) / 10} of ${v.max}`).join(", ")}`).join(". ")}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((t) => <polygon key={t} points={ring(t)} fill="none" stroke="var(--rule)" />)}
      {vectors.map((_, i) => { const [x, y] = at(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" />; })}
      {series.map((s) => (
        <g key={s.label} style={{ "--c": s.color } as CSSProperties}>
          <polygon points={s.values.map((v, i) => at(i, Math.max(0.04, v)).join(",")).join(" ")}
            fill={s.fill ? s.color : "none"} fillOpacity={s.fill ? 0.14 : 0} stroke={s.color} strokeWidth={s.fill ? 2 : 1.5} strokeLinejoin="round" />
          {s.fill && s.values.map((v, i) => { const [x, y] = at(i, Math.max(0.04, v)); return <circle key={i} cx={x} cy={y} r={3.6} fill={s.color} stroke="var(--surface)" strokeWidth={1.6} />; })}
        </g>
      ))}
      {labels && vectors.map((v, i) => {
        const [x, y] = at(i, 1.09);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        const lines = twoLines(SHORT_VECTOR[v.key] ?? v.name);
        const above = y < cy - r * 0.9, below = y > cy + r * 0.9;
        const first = above ? -(lines.length - 1) * 1.15 - 0.25 : below ? 0.95 : 0.32 - (lines.length - 1) * 0.575;
        return (
          <text key={v.key} x={x} y={y} textAnchor={anchor} className="radar-label">
            {lines.map((l, j) => <tspan key={j} x={x} dy={`${j === 0 ? first : 1.15}em`}>{l}</tspan>)}
          </text>
        );
      })}
    </svg>
  );
}

/** Break a long label once, at the space nearest its middle. */
function twoLines(label: string): string[] {
  if (label.length < 15 || !label.includes(" ")) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) if (label[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [label.slice(0, best), label.slice(best + 1)];
}
