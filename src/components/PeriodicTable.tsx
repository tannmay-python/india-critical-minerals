// The periodic table as the site's one overview. The same tiles answer different questions as the
// lens changes: which elements India lists, how many national lists name each, which of six groups
// each falls in, how each scores on any measure, where India has projects along the chain, and
// which have a capability pathway. Under the groups lens the 51 tiles leave their periodic
// positions and gather into the six groups.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Band, ElementRow, Mineral } from "../data/types";
import { BAND_COLOR, groupColor, inkOn, SEQ5, sequential } from "../lib/colors";
import { href, mineralHref } from "../lib/router";
import { useTip } from "./Tip";
import "./PeriodicTable.css";

export type Lens = "india" | "lists" | "groups" | "score" | "projects" | "capability";
export const LENSES: { id: Lens; label: string }[] = [
  { id: "india", label: "India's list" },
  { id: "lists", label: "The world's lists" },
  { id: "groups", label: "Six groups" },
  { id: "score", label: "Scores" },
  { id: "projects", label: "India's projects" },
  { id: "capability", label: "What to build" },
];

const BANDS: Band[] = ["upstream", "process", "make", "recycle", "research"];
const TIME_STEPS = ["0-3 yrs", "3-7 yrs", "7+ yrs"];
const CATEGORY_NAME: Record<string, string> = { syn: "Synthetic", rad: "Radioactive, no commercial supply", gas: "Atmospheric gas", hhe: "Not mined as an ore", com: "Mined, not on India's list" };
const GAP = 4;

interface Props {
  lens: Lens;
  /** India's-list lens: which step of the reduction is shown (0 to 5). */
  step: number;
  /** Scores lens: index into core.subscores. */
  score: number;
}

interface Tile {
  key: string; el: ElementRow; mineral: Mineral | undefined;
  x: number; y: number; visible: boolean;
  fill: string; ink: string; faint: boolean; outline: boolean;
  glyph?: ReactNode;
}

export function PeriodicTable({ lens, step, score }: Props) {
  const core = useCore();
  const tip = useTip();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const byElement = useMemo(() => {
    const alias: Record<string, string> = { Carbon: "Graphite", Potassium: "Potash" };
    return new Map(core.elements.map((el) => [el[0], core.mineral.get(alias[el[2]] ?? el[2])]));
  }, [core]);

  const sub = core.subscores[score];
  const removed = useMemo(() => new Set(core.ptSteps.slice(0, step + 1).map((s) => s.removes).filter(Boolean) as string[]), [core, step]);

  const narrow = width > 0 && width < 720;
  // on a phone the grouped tiles get twice the room; the periodic layout always needs its 18 columns
  const cols = lens === "groups" && narrow ? 9 : 18;
  const cell = width ? (width - GAP * (cols - 1)) / cols : 0;
  const pitch = cell + GAP;

  // ---- where each tile sits ------------------------------------------------------------------
  const groupOrder = [1, 2, 3, 4, 5, 6, 0];
  const labelCols = narrow ? 0 : 6; // columns reserved for the group's name and tagline
  const perRow = (narrow ? 9 : 18) - labelCols;
  const groupRows = useMemo(() => {
    let y = 0;
    return groupOrder.map((id) => {
      const members = core.membersOf(id);
      const rows = Math.max(1, Math.ceil(members.length / perRow));
      const top = y + (narrow ? 0.7 : 0);
      y = top + rows + 0.42;
      return { id, members, top, rows };
    });
  }, [core, perRow, narrow]);
  const groupPos = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    for (const g of groupRows) g.members.forEach((m, i) => pos.set(m.name, { x: labelCols + (i % perRow), y: g.top + Math.floor(i / perRow) }));
    return pos;
  }, [groupRows, labelCols, perRow]);

  const periodicRows = 9.35;
  const groupedRows = groupRows.length ? groupRows[groupRows.length - 1].top + groupRows[groupRows.length - 1].rows : 0;
  const rowsTall = lens === "groups" ? groupedRows : periodicRows;

  const tiles: Tile[] = core.elements.map((el) => {
    const [z, , , row, col, cat, critical] = el;
    const m = byElement.get(z);
    const py = row <= 7 ? row - 1 : row - 1.65; // lanthanides and actinides sit a little apart
    let x = col - 1, y = py, visible = true;
    let fill = "var(--surface-2)", ink = "var(--ink-2)", faint = false, outline = false;
    let glyph: ReactNode;

    if (lens === "india") {
      if (critical) { fill = "var(--plum)"; ink = "#fff"; }
      if (!critical && cat !== "com" && removed.has(cat)) faint = true;
      if (!critical && step === core.ptSteps.length - 1) faint = true;
    } else if (lens === "lists") {
      const n = core.ptLists[el[1]] ?? 0;
      if (n > 0) { fill = SEQ5[n - 1]; ink = inkOn(fill); } else faint = true;
    } else if (lens === "groups") {
      if (m) {
        const p = groupPos.get(m.name)!;
        x = p.x; y = p.y; fill = groupColor(m.group); ink = inkOn(fill);
      } else visible = false;
    } else if (!m) {
      faint = true;
    } else if (lens === "score") {
      const v = m.s[sub.i];
      fill = sequential(0.08 + 0.92 * ((v - (sub.max === 5 ? 1 : 0)) / (sub.max - (sub.max === 5 ? 1 : 0))));
      ink = inkOn(fill);
    } else if (lens === "projects") {
      fill = "var(--surface)"; ink = "var(--ink)"; outline = true;
      if (!m.projects.total) { ink = "var(--muted)"; }
      glyph = (
        <span className="pt-chain" aria-hidden="true">
          {BANDS.map((b) => {
            const n = m.projects.byBand[b] ?? 0;
            return <i key={b} style={{ background: n ? BAND_COLOR[b] : "transparent" }} className={n ? "" : "empty"} />;
          })}
        </span>
      );
    } else if (lens === "capability") {
      if (m.capability) {
        const t = TIME_STEPS.indexOf(m.capability.time);
        fill = [SEQ5[4], SEQ5[2], SEQ5[1]][t < 0 ? 1 : t]; ink = inkOn(fill);
      } else { fill = "var(--surface)"; ink = "var(--muted)"; outline = true; }
    }
    return { key: String(z), el, mineral: m, x, y, visible, fill, ink, faint, outline, glyph };
  });

  // ---- hover ---------------------------------------------------------------------------------
  function describe(t: Tile): ReactNode {
    const [z, , name, , , cat] = t.el;
    const m = t.mineral;
    if (!m) return <><strong>{name}</strong><span>{z} · {CATEGORY_NAME[cat]}</span></>;
    const g = core.group.get(m.group)!;
    const rows: [string, string | number][] = [];
    if (lens === "lists") rows.push(["National lists naming it", `${m.lists} of 5`]);
    if (lens === "score") rows.push([sub.name, `${m.s[sub.i]} / ${sub.max}`]);
    if (lens === "projects") {
      if (!m.projects.total) rows.push(["Projects mapped", "none"]);
      for (const b of core.bands) if (m.projects.byBand[b.id]) rows.push([b.label, m.projects.byBand[b.id]!]);
      if (m.projects.demand) rows.push(["Demand anchors", m.projects.demand]);
    }
    if (lens === "capability" && m.capability) rows.push(["Time to output", m.capability.time.replace("-", "–")], ["Ease for India", m.capability.ease]);
    return (
      <>
        <strong>{m.name}</strong>
        <span className="tip-group"><i className="swatch" style={{ "--c": groupColor(m.group) } as CSSProperties} />{g.name}</span>
        {rows.map(([k, v]) => <span className="tip-row" key={k}><span>{k}</span><b>{v}</b></span>)}
        {lens === "capability" && m.capability && <span className="tip-note">{m.capability.nextMove}</span>}
        {lens === "capability" && !m.capability && <span className="tip-note">No pathway drawn for this group.</span>}
      </>
    );
  }

  return (
    <div className={`pt pt-${lens}`} ref={box} style={{ height: cell ? rowsTall * pitch - GAP : undefined, "--cell": `${cell}px` } as CSSProperties}>
      {cell > 0 && lens === "groups" && groupRows.map((g) => {
        const def = core.group.get(g.id)!;
        return (
          <a key={g.id} className="pt-group" href={href(`/groups/${g.id}`)}
            style={narrow
              ? { transform: `translate(0px, ${(g.top - 0.7) * pitch}px)`, width: "100%" }
              : { transform: `translate(0px, ${g.top * pitch}px)`, width: labelCols * pitch - 20, minHeight: cell }}>
            <span className="pt-group-name"><i className="swatch" style={{ "--c": groupColor(g.id) } as CSSProperties} />{def.name}</span>
            {!narrow && def.tagline && <span className="pt-group-tag">{def.tagline}</span>}
          </a>
        );
      })}
      {cell > 0 && tiles.map((t) => {
        const [z, symbol, name] = t.el;
        const style: CSSProperties = {
          transform: `translate(${t.x * pitch}px, ${t.y * pitch}px)`,
          width: cell, height: cell, background: t.fill, color: t.ink,
          opacity: t.visible ? (t.faint ? 0.22 : 1) : 0,
          pointerEvents: t.visible ? undefined : "none",
        };
        const cls = `pt-cell${t.outline ? " outline" : ""}${t.mineral ? " is-mineral" : ""}`;
        const inner = (
          <>
            <span className="pt-z num">{z}</span>
            <span className="pt-sym">{symbol}</span>
            {t.glyph}
          </>
        );
        const handlers = {
          onPointerEnter: (ev: React.PointerEvent) => tip.show(describe(t), ev.currentTarget),
          onPointerLeave: tip.hide,
          onFocus: (ev: React.FocusEvent) => tip.show(describe(t), ev.currentTarget),
          onBlur: tip.hide,
        };
        return t.mineral
          ? <a key={t.key} className={cls} style={style} href={mineralHref(t.mineral.name)} aria-label={t.mineral.name} tabIndex={t.visible ? 0 : -1} {...handlers}>{inner}</a>
          : <span key={t.key} className={cls} style={style} aria-label={name} {...handlers}>{inner}</span>;
      })}
    </div>
  );
}
