// How many elements sit on each country's critical-minerals list, over time. Every list grows;
// India's is the point, so it carries the one accent and the rest are drawn as context.
import { line, scaleLinear } from "d3";
import type { ListSeries } from "../data/types";
import { useSize } from "../lib/useSize";
import { useTip } from "./Tip";

const SHORT: Record<string, string> = { "European Union": "EU", "United States": "US" };

export function ListsChart({ series }: { series: ListSeries[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const tip = useTip();
  const height = Math.max(240, Math.min(340, width * 0.62));
  const m = { top: 12, right: 96, bottom: 26, left: 30 };
  const x = scaleLinear([2010, 2026], [m.left, width - m.right]);
  const y = scaleLinear([0, 70], [height - m.bottom, m.top]);
  const path = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]));

  // end labels, pushed apart where lists finish close together
  const ends = series.map((s) => {
    const [year, n] = s.data[s.data.length - 1];
    return { s, year, n, px: x(year), py: y(n), ly: y(n) };
  }).sort((a, b) => a.py - b.py);
  const gap = 15;
  for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < gap) ends[i].ly = ends[i - 1].ly + gap;
  const overflow = ends.length ? ends[ends.length - 1].ly - (height - m.bottom) : 0;
  if (overflow > 0) for (const e of ends) e.ly -= overflow;
  const labelX = width - m.right + 14;

  return (
    <div ref={ref} className="lists-chart">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => `${s.label}: ${s.data.map(([yr, n]) => `${n} in ${yr}`).join(", ")}`).join(". ")}>
          {[0, 20, 40, 60].map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="axis">{t}</text>
            </g>
          ))}
          {[2010, 2014, 2018, 2022, 2026].map((t) => <text key={t} x={x(t)} y={height - 6} textAnchor="middle" className="axis">{t}</text>)}
          {series.filter((s) => !s.india).map((s) => (
            <g key={s.label}>
              {s.data.length > 1 && <path d={path(s.data) ?? ""} fill="none" stroke="var(--rule-strong)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
              {s.data.map(([yr, n]) => (
                <circle key={yr} cx={x(yr)} cy={y(n)} r={4} fill="#b79f6b" stroke="var(--surface)" strokeWidth={2} />
              ))}
            </g>
          ))}
          {series.filter((s) => s.india).map((s) => s.data.map(([yr, n]) => (
            <circle key={yr} cx={x(yr)} cy={y(n)} r={6.5} fill="var(--plum)" stroke="var(--surface)" strokeWidth={2} />
          )))}
          {ends.map((e) => (
            <g key={e.s.label}>
              <line x1={e.px + 7} y1={e.py} x2={labelX - 4} y2={e.ly} stroke="var(--rule-strong)" />
              <text x={labelX} y={e.ly} dy="0.32em" className={e.s.india ? "end india" : "end"}>
                {SHORT[e.s.label] ?? e.s.label} <tspan className="end-n">{e.n}</tspan>
              </text>
            </g>
          ))}
          {series.flatMap((s) => s.data.map(([yr, n]) => (
            <circle key={s.label + yr} cx={x(yr)} cy={y(n)} r={13} fill="transparent" tabIndex={0}
              aria-label={`${s.label}, ${yr}: ${n} elements`}
              onPointerEnter={(ev) => tip.show(<><strong>{n} elements</strong><span>{s.label}, {yr}</span></>, ev.currentTarget)}
              onPointerLeave={tip.hide}
              onFocus={(ev) => tip.show(<><strong>{n} elements</strong><span>{s.label}, {yr}</span></>, ev.currentTarget)}
              onBlur={tip.hide} />
          )))}
        </svg>
      )}
    </div>
  );
}
