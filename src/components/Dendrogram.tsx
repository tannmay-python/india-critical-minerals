// The clustering tree (Ward linkage on the fifteen scores), from the dashboard's own derived data.
// Leaves take their group's colour; a join is coloured when both branches belong to one group and
// drawn in grey when it joins different groups. The tree draws itself once, bottom up, then rests.
import { useEffect, useMemo, useRef, useState } from "react";
import { useCore } from "../data/store";
import { groupColor } from "../lib/colors";
import { mineralHref } from "../lib/router";
import { useSize } from "../lib/useSize";

const MIXED = "#cdbfa6";

export function Dendrogram() {
  const core = useCore();
  const d = core.dendrogram;
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [grown, setGrown] = useState(0); // 0..1 of the tree's height revealed
  const started = useRef(false);

  // the dashboard's colours identify the group; draw with this site's tuned set
  const groupOfColor = useMemo(() => new Map(core.groups.map((g) => [g.sourceColor.toLowerCase(), g.id])), [core]);
  const color = (hex: string | undefined) => {
    const id = hex ? groupOfColor.get(hex.toLowerCase()) : undefined;
    return id === undefined ? MIXED : groupColor(id);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      if (reduce) { setGrown(1); return; }
      const t0 = performance.now(), dur = 4200;
      const tick = (t: number) => { const k = Math.min(1, (t - t0) / dur); setGrown(1 - (1 - k) ** 2); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  const H = 480, m = { top: 22, right: 12, bottom: 96, left: 52 };
  const w = Math.max(width, 720);
  const x = (i: number) => m.left + (i / (d.n - 1)) * (w - m.left - m.right);
  const y = (h: number) => H - m.bottom - (h / d.maxHeight) * (H - m.top - m.bottom);
  const limit = grown * d.maxHeight;
  const ticks = [0, 4, 8, 12, 16].filter((t) => t <= d.maxHeight + 1);
  type Merge = { ax: number; ah: number; bx: number; bh: number; top: number; color?: string };

  return (
    <div ref={ref} className="dendro">
      {width > 0 && (
        <svg width={w} height={H} role="img" aria-label="Clustering tree of the 51 minerals">
          <text transform={`translate(13,${(H - m.bottom + m.top) / 2}) rotate(-90)`} textAnchor="middle" className="dendro-axis">Dissimilarity (Ward linkage distance)</text>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left - 6} x2={w - m.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" />
              <text x={m.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="dendro-axis">{t}</text>
            </g>
          ))}
          {(d.merges as unknown as Merge[]).map((g, i) => {
            if (g.top > limit + 1e-9) return null;
            return <path key={i} d={`M${x(g.ax)},${y(g.ah)} V${y(g.top)} H${x(g.bx)} V${y(g.bh)}`} fill="none" stroke={color(g.color)} strokeWidth={color(g.color) === MIXED ? 1.5 : 2} strokeLinejoin="round" />;
          })}
          {d.leaves.map((l) => (
            <a key={l.name} href={mineralHref(l.name)}>
              <circle cx={x(l.x)} cy={y(0)} r={3.4} fill={groupColor(l.group)} />
              <text transform={`translate(${x(l.x)},${y(0) + 10}) rotate(-58)`} textAnchor="end" dy="0.32em" className="dendro-leaf">{l.name}</text>
            </a>
          ))}
        </svg>
      )}
    </div>
  );
}
