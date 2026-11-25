// Temporary: four ways to lay out the capabilities to build and the chemistry India has, to compare
// on the Capabilities page and pick one. The one picked replaces the lists; the others go.
import { useState, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Capability } from "../data/types";
import { groupColor, inkOn } from "../lib/colors";
import { href, mineralHref } from "../lib/router";
import "./CapViews.css";

export const CAP_VIEWS = [
  { id: "cards", label: "Cards" },
  { id: "ladder", label: "Ladder" },
  { id: "matrix", label: "Matrix" },
  { id: "rows", label: "Rows" },
  { id: "now", label: "Current" },
] as const;
export type CapView = (typeof CAP_VIEWS)[number]["id"];

const GROUP_ORDER = [1, 2, 3, 4, 5, 6, 0];
/** "4-5" -> [4, 5]; "3" -> [3, 3] */
const range = (complexity: string): [number, number] => {
  const lo = Number(/\d/.exec(complexity)?.[0] ?? 0), hi = Number(/(\d)\D*$/.exec(complexity)?.[1] ?? lo);
  return [lo, Math.max(lo, hi)];
};

/** Five segments: solid up to the low end of the range, lighter to its high end. */
function Meter({ complexity }: { complexity: string }) {
  const [lo, hi] = range(complexity);
  return <span className="cv-meter" title={`Complexity ${complexity.replace("-", "–")} of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= lo ? "on" : n <= hi ? "half" : ""} />)}</span>;
}

export function CapViews({ view, cap }: { view: Exclude<CapView, "now">; cap: Capability }) {
  const core = useCore();
  const byId = new Map(cap.minerals.map((m) => [m.id, m]));
  const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
  const chemistry = cap.chemistry;
  const tiles = (ids: string[], size: "sm" | "xs", link = true): ReactNode =>
    ids.map((id) => byId.get(id)).filter(Boolean).sort((a, b) => GROUP_ORDER.indexOf(a!.group) - GROUP_ORDER.indexOf(b!.group)).map((m) => {
      const c = groupColor(m!.group);
      const style = { background: c, color: inkOn(c) };
      return link
        ? <a key={m!.id} className={`cv-tile ${size}`} href={mineralHref(m!.name)} title={m!.name} style={style}>{m!.symbol}</a>
        : <span key={m!.id} className={`cv-tile ${size}`} title={m!.name} style={style}>{m!.symbol}</span>;
    });

  if (view === "cards") return (
    <>
      <div className="cv-cards">
        {strategies.map((s) => (
          <div className="cv-card" key={s.id}>
            <span className="cv-card-top"><span className="cv-n num">{s.number}</span><Meter complexity={s.complexity} /></span>
            <a className="cv-card-name" href={href(`/capability/${s.slug}`)}>{s.name}</a>
            <span className="cv-card-what">{s.what}</span>
            <span className="cv-tiles">{tiles(s.minerals, "sm")}</span>
          </div>
        ))}
      </div>
      <section className="cap-section">
        <h2>Chemistry India already has</h2>
        <div className="cv-cards tech">
          {chemistry.map((k) => (
            <div className="cv-card tech" key={k.id}>
              <a className="cv-card-name" href={href(`/technology/${k.slug}`)}>{k.name}</a>
              <span className="cv-card-what">{k.who}</span>
              <span className="cv-tiles">{tiles(k.minerals, "xs")}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  if (view === "ladder") {
    const climb = [...strategies].sort((a, b) => range(a.complexity)[0] - range(b.complexity)[0] || range(a.complexity)[1] - range(b.complexity)[1] || a.number - b.number);
    const reach = [...chemistry].sort((a, b) => b.minerals.length - a.minerals.length);
    const most = Math.max(...reach.map((k) => k.minerals.length));
    const ticks: [number, string][] = [[1, "Physical separation"], [2, ""], [3, "Multi-stage hydrometallurgy"], [4, "Near-identical elements"], [5, "Nation-state level"]];
    return (
      <>
        <div className="cv-ladder">
          <div className="cv-rung head" aria-hidden="true">
            <span />
            <span className="cv-scale">{ticks.map(([n, t]) => <span key={n}><b className="num">{n}</b>{t}</span>)}</span>
            <span />
          </div>
          {climb.map((s) => {
            const [lo, hi] = range(s.complexity);
            return (
              <div className="cv-rung" key={s.id}>
                <a className="cv-rung-name" href={href(`/capability/${s.slug}`)} title={s.what}>{s.name}</a>
                <span className="cv-track"><i style={{ "--lo": lo, "--hi": hi } as CSSProperties} /></span>
                <span className="cv-tiles">{tiles(s.minerals, "xs")}</span>
              </div>
            );
          })}
        </div>
        <section className="cap-section">
          <h2>Chemistry India already has</h2>
          <div className="cv-reach">
            {reach.map((k) => (
              <div className="cv-reach-row" key={k.id}>
                <a href={href(`/technology/${k.slug}`)} title={k.who}>{k.name}</a>
                <span className="cv-reach-bar"><i style={{ width: `${(k.minerals.length / most) * 100}%` }} /><b className="num">{k.minerals.length}</b></span>
                <span className="cv-fit">{k.fit}</span>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (view === "matrix") {
    const used = new Set([...strategies.flatMap((s) => s.minerals), ...chemistry.flatMap((k) => k.minerals)]);
    const cols = cap.minerals.filter((m) => used.has(m.id)).sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name));
    const cells = (ids: string[], ring: boolean) => cols.map((m) => (
      <span key={m.id} className="cv-cell">{ids.includes(m.id) && <i className={ring ? "ring" : ""} style={{ "--c": groupColor(m.group) } as CSSProperties} title={m.name} />}</span>
    ));
    return (
      <div className="cv-matrix" style={{ "--cols": cols.length } as CSSProperties}>
        <span className="cv-mhead" />
        {cols.map((m) => { const c = groupColor(m.group); return <a key={m.id} className="cv-tile xs cv-col" href={mineralHref(m.name)} title={m.name} style={{ background: c, color: inkOn(c) }}>{m.symbol}</a>; })}
        {strategies.map((s) => (
          <div className="cv-mrow" key={s.id}>
            <span className="cv-mlabel"><a href={href(`/capability/${s.slug}`)}>{s.name}</a><Meter complexity={s.complexity} /></span>
            {cells(s.minerals, false)}
          </div>
        ))}
        <h3 className="cv-mgroup">Chemistry India already has</h3>
        {chemistry.map((k) => (
          <div className="cv-mrow" key={k.id}>
            <span className="cv-mlabel"><a href={href(`/technology/${k.slug}`)}>{k.name}</a></span>
            {cells(k.minerals, true)}
          </div>
        ))}
        <p className="cv-mkey"><span><i /> Capability serves the mineral</span><span><i className="ring" /> Chemistry carries over to it</span><span className="muted">{core.minerals.length - cols.length} minerals are linked to neither</span></p>
      </div>
    );
  }

  return <Rows cap={cap} tiles={tiles} />;
}

function Rows({ cap, tiles }: { cap: Capability; tiles: (ids: string[], size: "sm" | "xs", link?: boolean) => ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
  return (
    <>
      <div className="cv-rows">
        {strategies.map((s) => {
          const isOpen = open === s.id;
          return (
            <div className={`cv-row${isOpen ? " open" : ""}`} key={s.id}>
              <button type="button" className="cv-row-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="cv-n num">{s.number}</span>
                <span className="cv-row-name">{s.name}</span>
                <Meter complexity={s.complexity} />
                <span className="cv-tiles">{tiles(s.minerals, "xs", false)}</span>
                <i className="cv-caret" aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="cv-row-body">
                  <p className="cv-what">{s.what}</p>
                  <dl className="cv-facts">
                    <div><dt>India has</dt><dd>{s.india_base}</dd></div>
                    <div><dt>Gap</dt><dd>{s.gap}</dd></div>
                    <div><dt>Done outside China</dt><dd>{s.outside_china}</dd></div>
                    <div><dt>Cost</dt><dd>{s.cost}</dd></div>
                  </dl>
                  <a className="cv-open" href={href(`/capability/${s.slug}`)}>{s.name}</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <section className="cap-section">
        <h2>Chemistry India already has</h2>
        <div className="cv-rows">
          {cap.chemistry.map((k) => {
            const isOpen = open === k.id;
            return (
              <div className={`cv-row${isOpen ? " open" : ""}`} key={k.id}>
                <button type="button" className="cv-row-head tech" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : k.id)}>
                  <span className="cv-row-name">{k.name}</span>
                  <span className="cv-tiles">{tiles(k.minerals, "xs", false)}</span>
                  <i className="cv-caret" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="cv-row-body">
                    <p className="cv-what">{k.guide?.summary ?? k.carries_over_to}</p>
                    <dl className="cv-facts">
                      <div><dt>Who in India</dt><dd>{k.who}</dd></div>
                      <div><dt>Fit</dt><dd>{k.fit}</dd></div>
                    </dl>
                    <a className="cv-open" href={href(`/technology/${k.slug}`)}>{k.name}</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
