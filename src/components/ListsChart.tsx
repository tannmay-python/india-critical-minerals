// How many elements sit on each country's critical-minerals list, over time. Drawn as on
// indiacriticalminerals.com: one colour and one marker shape per list, the key underneath,
// India as the large plum triangle.
import { line, scaleLinear } from "d3";
import type { ListSeries } from "../data/types";
import { useSize } from "../lib/useSize";
import { useTip } from "./Tip";

type Shape = "circle" | "rect" | "cross" | "triangle" | "diamond";
const STYLE: Record<string, { color: string; shape: Shape }> = {
  "European Union": { color: "#3d6b7d", shape: "circle" },
  "United States": { color: "#c42b1e", shape: "rect" },
  Australia: { color: "#7d6b9e", shape: "cross" },
  Canada: { color: "#8a5a44", shape: "triangle" },
  Russia: { color: "#2e8b57", shape: "diamond" },
  India: { color: "#620d3c", shape: "triangle" },
};
const FALLBACK = { color: "#856034", shape: "circle" as Shape };

function Marker({ shape, color, r, x = 0, y = 0 }: { shape: Shape; color: string; r: number; x?: number; y?: number }) {
  const t = `translate(${x},${y})`;
  if (shape === "rect") return <rect transform={t} x={-r * 0.8} y={-r * 0.8} width={r * 1.6} height={r * 1.6} fill={color} />;
  if (shape === "cross") return <path transform={t} d={`M${-r * 0.8},${-r * 0.8}L${r * 0.8},${r * 0.8}M${-r * 0.8},${r * 0.8}L${r * 0.8},${-r * 0.8}`} stroke={color} strokeWidth={2} fill="none" />;
  if (shape === "triangle") return <path transform={t} d={`M0,${-r}L${r * 0.87},${r * 0.62}L${-r * 0.87},${r * 0.62}Z`} fill={color} />;
  if (shape === "diamond") return <path transform={t} d={`M0,${-r * 1.1}L${r * 1.1},0L0,${r * 1.1}L${-r * 1.1},0Z`} fill={color} />;
  return <circle transform={t} r={r} fill={color} />;
}

export function ListsChart({ series }: { series: ListSeries[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const tip = useTip();
  const height = width < 520 ? 260 : 300;
  const m = { top: 10, right: 12, bottom: 24, left: 46 };
  const x = scaleLinear([2010, 2026], [m.left, width - m.right]);
  const y = scaleLinear([0, 70], [height - m.bottom, m.top]);
  const path = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]));
  const style = (s: ListSeries) => STYLE[s.label] ?? FALLBACK;
  const told = (s: ListSeries, yr: number, n: number) => <><strong>{yr}</strong><span>{s.label}: {n} expanded elements</span></>;

  return (
    <div ref={ref} className="lists-chart">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => `${s.label}: ${s.data.map(([yr, n]) => `${n} in ${yr}`).join(", ")}`).join(". ")}>
          {[0, 20, 40, 60, 70].map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="axis">{t}</text>
            </g>
          ))}
          {[2010, 2014, 2018, 2022, 2026].map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.top} y2={height - m.bottom} className="grid" />
              <text x={x(t)} y={height - 6} textAnchor="middle" className="axis">{t}</text>
            </g>
          ))}
          <text transform={`translate(11,${(height - m.bottom + m.top) / 2}) rotate(-90)`} textAnchor="middle" className="axis">Elements on list</text>
          {series.map((s) => {
            const st = style(s);
            return (
              <g key={s.label}>
                {s.data.length > 1 && !s.india && <path d={path(s.data) ?? ""} fill="none" stroke={st.color} strokeWidth={2} />}
                {s.data.map(([yr, n]) => <Marker key={yr} shape={st.shape} color={st.color} r={s.india ? 8 : 4.5} x={x(yr)} y={y(n)} />)}
              </g>
            );
          })}
          {series.flatMap((s) => s.data.map(([yr, n]) => (
            <circle key={s.label + yr} cx={x(yr)} cy={y(n)} r={11} fill="transparent" tabIndex={0}
              aria-label={`${s.label}, ${yr}: ${n} elements`}
              onPointerEnter={(ev) => tip.show(told(s, yr, n), ev.currentTarget)} onPointerLeave={tip.hide}
              onFocus={(ev) => tip.show(told(s, yr, n), ev.currentTarget)} onBlur={tip.hide} />
          )))}
        </svg>
      )}
      <ul className="lists-key">
        {series.map((s) => (
          <li key={s.label}>
            <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden="true"><Marker shape={style(s).shape} color={style(s).color} r={s.india ? 6 : 5} /></svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
