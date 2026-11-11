// How capability carries over: the chemistry India already has, on the left, feeds the capabilities
// it could build, in the middle, and each capability serves the minerals on the right. One
// capability often serves many minerals, and one existing strength often feeds several
// capabilities; the links make that visible.
import { useMemo, useState, type CSSProperties } from "react";
import { useCore } from "../data/store";
import type { Capability } from "../data/types";
import { groupColor } from "../lib/colors";
import { href, mineralHref } from "../lib/router";
import { useSize } from "../lib/useSize";
import "./CapabilityNetwork.css";

interface Node { id: string; kind: "chem" | "strategy" | "mineral"; label: string; y: number; h: number; link: string; group?: number; symbol?: string; number?: number }

export function CapabilityNetwork({ cap }: { cap: Capability }) {
  const core = useCore();
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hot, setHot] = useState<string | null>(null);

  const model = useMemo(() => {
    const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
    const sIndex = new Map(strategies.map((s, i) => [s.id, i]));
    const chemToStrategy = cap.chemistry.flatMap((k) => (k.guide?.related_strategies ?? []).filter((s) => sIndex.has(s)).map((s) => [k.id, s] as const));
    const strategyToMineral = strategies.flatMap((s) => s.minerals.map((m) => [s.id, m] as const));
    const bary = (ids: string[]) => (ids.length ? ids.reduce((a, s) => a + (sIndex.get(s) ?? 0), 0) / ids.length : 99);
    const chems = [...cap.chemistry].sort((a, b) => bary(a.guide?.related_strategies ?? []) - bary(b.guide?.related_strategies ?? []));
    const groupIds = [...new Set(cap.minerals.map((m) => m.group))];
    const groupBary = new Map(groupIds.map((g) => [g, bary(cap.minerals.filter((m) => m.group === g).flatMap((m) => m.strategies))]));
    const minerals = [...cap.minerals].sort((a, b) => groupBary.get(a.group)! - groupBary.get(b.group)! || bary(a.strategies) - bary(b.strategies));
    return { strategies, chems, minerals, chemToStrategy, strategyToMineral };
  }, [cap]);

  const H = 700;
  const layout = useMemo(() => {
    const nodes = new Map<string, Node>();
    const place = (n: number, i: number, pad = 0) => ({ y: pad + ((H - pad * 2) / n) * (i + 0.5), h: Math.min(44, ((H - pad * 2) / n) * 0.62) });
    model.chems.forEach((k, i) => nodes.set(k.id, { id: k.id, kind: "chem", label: k.name, link: href(`/technology/${k.slug}`), ...place(model.chems.length, i, 16) }));
    model.strategies.forEach((s, i) => nodes.set(s.id, { id: s.id, kind: "strategy", label: s.name, number: s.number, link: href(`/capability/${s.slug}`), ...place(model.strategies.length, i) }));
    // minerals: a little air between groups
    const gaps = new Set(model.minerals.map((m) => m.group)).size - 1;
    const unit = (H - gaps * 14) / model.minerals.length;
    let y = 0, last: number | null = null;
    for (const m of model.minerals) {
      if (last !== null && m.group !== last) y += 14;
      nodes.set(m.id, { id: m.id, kind: "mineral", label: m.name, symbol: m.symbol, group: m.group, link: mineralHref(m.name), y: y + unit / 2, h: unit * 0.62 });
      y += unit; last = m.group;
    }
    return nodes;
  }, [model]);

  // which nodes light up with the hovered one
  const lit = useMemo(() => {
    if (!hot) return null;
    const on = new Set<string>([hot]);
    const node = layout.get(hot);
    const sOf = (id: string) => model.chemToStrategy.filter(([k]) => k === id).map(([, s]) => s);
    const kOf = (id: string) => model.chemToStrategy.filter(([, s]) => s === id).map(([k]) => k);
    const mOf = (id: string) => model.strategyToMineral.filter(([s]) => s === id).map(([, m]) => m);
    const sOfM = (id: string) => model.strategyToMineral.filter(([, m]) => m === id).map(([s]) => s);
    if (node?.kind === "chem") for (const s of sOf(hot)) { on.add(s); mOf(s).forEach((m) => on.add(m)); }
    if (node?.kind === "strategy") { kOf(hot).forEach((k) => on.add(k)); mOf(hot).forEach((m) => on.add(m)); }
    if (node?.kind === "mineral") for (const s of sOfM(hot)) { on.add(s); kOf(s).forEach((k) => on.add(k)); }
    return on;
  }, [hot, layout, model]);

  const compact = width > 0 && width < 900;
  if (compact) return <div ref={ref} />; // the lists below carry the same links on small screens
  const x0 = Math.min(300, width * 0.26), x1 = width * 0.47, x2 = width - Math.min(190, width * 0.17);
  const bar = 6;
  const linkOn = (a: string, b: string) => !lit || (lit.has(a) && lit.has(b) && (hot === a || hot === b || layout.get(hot!)?.kind !== "strategy"));

  // spread a node's links along its height so they do not pile on one point
  const ports = (pairs: readonly (readonly [string, string])[], side: 0 | 1) => {
    const by = new Map<string, string[]>();
    for (const p of pairs) (by.get(p[side]) ?? by.set(p[side], []).get(p[side])!).push(p[1 - side]);
    const at = new Map<string, number>();
    for (const [id, others] of by) {
      const n = layout.get(id)!;
      others.sort((a, b) => layout.get(a)!.y - layout.get(b)!.y).forEach((o, i) => at.set(`${id}|${o}`, n.y + (others.length === 1 ? 0 : (i / (others.length - 1) - 0.5) * n.h * 0.86)));
    }
    return at;
  };
  const ksOut = ports(model.chemToStrategy, 0), ksIn = ports(model.chemToStrategy, 1);
  const smOut = ports(model.strategyToMineral, 0), smIn = ports(model.strategyToMineral, 1);
  const curve = (xa: number, ya: number, xb: number, yb: number) => { const mx = (xa + xb) / 2; return `M${xa},${ya} C${mx},${ya} ${mx},${yb} ${xb},${yb}`; };
  const mineralGroup = new Map(model.minerals.map((m) => [m.id, m.group]));
  const hover = (id: string) => ({ onPointerEnter: () => setHot(id), onPointerLeave: () => setHot(null), onFocus: () => setHot(id), onBlur: () => setHot(null) });

  return (
    <div ref={ref} className="capnet" style={{ height: H + 40 }}>
      {width > 0 && (
        <>
          <svg width={width} height={H} aria-hidden="true">
            {model.chemToStrategy.map(([k, s]) => (
              <path key={k + s} d={curve(x0 + bar, ksOut.get(`${k}|${s}`)!, x1, ksIn.get(`${s}|${k}`)!)} className={`cn-link ks${linkOn(k, s) ? "" : " off"}${lit && linkOn(k, s) ? " on" : ""}`} />
            ))}
            {model.strategyToMineral.map(([s, m]) => (
              <path key={s + m} d={curve(x1 + bar, smOut.get(`${s}|${m}`)!, x2, smIn.get(`${m}|${s}`)!)} className={`cn-link sm${linkOn(s, m) ? "" : " off"}${lit && linkOn(s, m) ? " on" : ""}`} style={{ stroke: groupColor(mineralGroup.get(m)!) }} />
            ))}
            {[...layout.values()].map((n) => (
              <rect key={n.id} x={n.kind === "chem" ? x0 : n.kind === "strategy" ? x1 : x2} y={n.y - n.h / 2} width={bar} height={n.h} rx={2}
                fill={n.kind === "mineral" ? groupColor(n.group!) : "var(--ink)"} opacity={lit && !lit.has(n.id) ? 0.2 : 1} />
            ))}
          </svg>
          {[...layout.values()].map((n) => {
            const style: CSSProperties = n.kind === "chem" ? { right: width - x0 + 12, top: n.y, width: x0 - 12 }
              : n.kind === "strategy" ? { left: x1 + bar + 10, top: n.y, width: Math.max(150, x2 - x1 - bar - 70) }
                : { left: x2 + bar + 10, top: n.y };
            return (
              <a key={n.id} href={n.link} className={`cn-node cn-${n.kind}${lit && !lit.has(n.id) ? " off" : ""}${hot === n.id ? " hot" : ""}`} style={style} {...hover(n.id)}>
                {n.kind === "mineral" ? <><b>{n.symbol}</b> {n.label}</> : n.label}
              </a>
            );
          })}
          <div className="cn-heads" aria-hidden="true">
            <span style={{ right: width - x0 + 12 }} className="left">Chemistry India already has</span>
            <span style={{ left: x1 }}>Capabilities to build</span>
            <span style={{ left: x2 }}>Minerals served</span>
          </div>
          <ul className="cn-key">
            {[...new Set(model.minerals.map((m) => m.group))].map((g) => <li key={g}><i className="swatch" style={{ "--c": groupColor(g) } as CSSProperties} />{core.group.get(g)?.name}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
