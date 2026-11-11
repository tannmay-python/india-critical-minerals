// The same project marks as the map, arranged to answer other questions: where along the chain
// they sit, when each first became public, and how each auction tranche turned out.
// One mark is one record (or, on the auction board, one offering of a block).
import { useMemo, useState, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Project, StatusGroup } from "../data/types";
import { Mark } from "../components/ProjectMark";
import { useTip } from "../components/Tip";
import { fmtMonth } from "../lib/format";
import "./Boards.css";

interface BoardProps { projects: Project[]; selected: string | null; onPick(id: string): void }

const BAND_ORDER = ["upstream", "process", "make", "demand", "recycle", "research"] as const;
const RANK: Record<StatusGroup, number> = { active: 0, pipeline: 1, inactive: 2 };
const byStatus = (a: Project, b: Project) => RANK[a.group] - RANK[b.group] || a.name.localeCompare(b.name);

function useMark(onPick: (id: string) => void, selected: string | null) {
  const tip = useTip();
  return (p: Project, key: string, extra?: { group?: StatusGroup; note?: string; className?: string; onEnter?(): void; onLeave?(): void }) => {
    const content: ReactNode = <><strong>{p.name}</strong><span>{extra?.note ?? `${p.stage} · ${p.status}`}</span><span>{[p.district, p.state, p.abroad ? p.country : null].filter(Boolean).join(", ")}</span></>;
    return (
      <button key={key} type="button" className={`unit${p.id === selected ? " selected" : ""}${extra?.className ? ` ${extra.className}` : ""}`}
        aria-label={`${p.name}: ${extra?.note ?? p.status}`} aria-pressed={p.id === selected}
        onClick={() => onPick(p.id)}
        onPointerEnter={(ev) => { tip.show(content, ev.currentTarget); extra?.onEnter?.(); }}
        onPointerLeave={() => { tip.hide(); extra?.onLeave?.(); }}
        onFocus={(ev) => tip.show(content, ev.currentTarget)} onBlur={tip.hide}>
        <Mark kind={p.kind} band={p.band} group={extra?.group ?? p.group} size={13} />
      </button>
    );
  };
}

/** Along the chain: one column per stage band, the marks ten to a row. */
export function ChainBoard({ projects, selected, onPick }: BoardProps) {
  const core = useCore();
  const mark = useMark(onPick, selected);
  const label: Record<string, string> = { ...Object.fromEntries(core.bands.map((b) => [b.id, b.label])), demand: "Cell plants and fabs" };
  const columns = BAND_ORDER.map((band) => ({ band, list: projects.filter((p) => p.band === band).sort(byStatus) })).filter((c) => c.list.length);
  return (
    <div className="board chain-board">
      {columns.map((c) => {
        const stages = [...new Set(c.list.map((p) => p.stage))].sort((a, b) => order(core.stages, a) - order(core.stages, b));
        return (
          <section key={c.band} className="board-col">
            <h3>{label[c.band]}<span className="num">{c.list.length}</span></h3>
            {stages.map((st) => {
              const list = c.list.filter((p) => p.stage === st);
              return (
                <div key={st} className="board-group">
                  {stages.length > 1 && <h4>{st}<span className="num">{list.length}</span></h4>}
                  <div className="tens">{list.map((p) => mark(p, p.id))}</div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
const order = (stages: { id: string; order: number }[], id: string) => stages.find((s) => s.id === id)?.order ?? 99;

/** Through time: each record stands on the year it first became public. */
export function TimeBoard({ projects, selected, onPick }: BoardProps) {
  const mark = useMark(onPick, selected);
  const bins = useMemo(() => {
    const early: { label: string; test(y: number): boolean }[] = [
      { label: "to 1959", test: (y) => y < 1960 }, { label: "1960s", test: (y) => y >= 1960 && y < 1970 },
      { label: "1970s", test: (y) => y >= 1970 && y < 1980 }, { label: "1980s", test: (y) => y >= 1980 && y < 1990 },
      { label: "1990s", test: (y) => y >= 1990 && y < 2000 }, { label: "2000s", test: (y) => y >= 2000 && y < 2010 },
      { label: "2010–14", test: (y) => y >= 2010 && y < 2015 },
    ];
    const last = Math.max(2026, ...projects.map((p) => p.year ?? 0));
    const years = Array.from({ length: last - 2015 + 1 }, (_, i) => 2015 + i).map((yr) => ({ label: String(yr), test: (y: number) => y === yr }));
    const bandRank = (p: Project) => BAND_ORDER.indexOf(p.band as (typeof BAND_ORDER)[number]);
    return [...early, ...years].map((b, i) => ({
      label: b.label, wide: i >= early.length,
      list: projects.filter((p) => p.year !== null && b.test(p.year)).sort((a, c) => bandRank(a) - bandRank(c) || byStatus(a, c)),
    }));
  }, [projects]);
  const undated = projects.filter((p) => p.year === null).length;
  return (
    <div className="board time-board">
      <div className="time-plot">
        {bins.map((b) => (
          <div key={b.label} className={`time-col${b.wide ? " wide" : ""}`}>
            <span className="time-n num">{b.list.length || ""}</span>
            <div className="time-stack">{b.list.map((p) => mark(p, p.id, { note: `${p.stage} · ${p.status} · first public ${p.year}` }))}</div>
            <span className="time-label num">{b.label}</span>
          </div>
        ))}
      </div>
      {undated > 0 && <p className="board-note">{undated} without a first public date are not shown.</p>}
    </div>
  );
}

interface Offering { p: Project; t: string; o: string; d: string | null }
const OUTCOME_GROUP: Record<string, StatusGroup> = { "Preferred bidder": "active", Annulled: "inactive", "No bids": "inactive", Offered: "pipeline", Pending: "pipeline" };
const STATE: Record<string, string> = { AP: "Andhra Pradesh", CG: "Chhattisgarh", JH: "Jharkhand", KA: "Karnataka", MH: "Maharashtra", MP: "Madhya Pradesh", OD: "Odisha", RJ: "Rajasthan", UP: "Uttar Pradesh", GJ: "Gujarat", TN: "Tamil Nadu", BR: "Bihar" };

/** Auctions: every time a block was offered, by tranche, with how it ended. */
export function AuctionBoard({ projects, selected, onPick }: BoardProps) {
  const mark = useMark(onPick, selected);
  const [hot, setHot] = useState<string | null>(null);
  const sections = useMemo(() => {
    const offers: Offering[] = projects.filter((p) => p.kind === "block").flatMap((p) => p.tranches.map((t) => ({ p, ...t })));
    const byTranche = new Map<string, Offering[]>();
    for (const o of offers) (byTranche.get(o.t) ?? byTranche.set(o.t, []).get(o.t)!).push(o);
    const rows = [...byTranche].map(([id, list]) => ({
      id, list: list.sort((a, b) => RANK[OUTCOME_GROUP[a.o] ?? "pipeline"] - RANK[OUTCOME_GROUP[b.o] ?? "pipeline"] || a.p.name.localeCompare(b.p.name)),
      date: list.map((o) => o.d).filter(Boolean).sort()[0] ?? null,
      won: list.filter((o) => o.o === "Preferred bidder").length,
    }));
    const when = (r: (typeof rows)[number]) => r.date ?? (/(\d{4})/.exec(r.id)?.[1] ?? "9999");
    const sort = (list: typeof rows) => list.sort((a, b) => when(a).localeCompare(when(b)) || a.id.localeCompare(b.id, undefined, { numeric: true }));
    const out: { title: string; rows: typeof rows }[] = [];
    const take = (title: string, test: (id: string) => boolean) => { const r = sort(rows.filter((x) => test(x.id))); if (r.length) out.push({ title, rows: r }); };
    take("Centre", (id) => /^Centre-T\d/.test(id));
    take("Centre, exploration licences", (id) => /^Centre-EL/.test(id));
    take("Offshore", (id) => /^Offshore/.test(id));
    for (const code of [...new Set(rows.map((r) => r.id.split("-")[0]).filter((c) => STATE[c]))].sort((a, b) => STATE[a].localeCompare(STATE[b]))) {
      take(STATE[code], (id) => id.startsWith(code + "-"));
    }
    return out;
  }, [projects]);

  if (!sections.length) return <p className="board-note">No auction blocks match these filters.</p>;
  return (
    <div className="board auction-board">
      {sections.map((s) => (
        <section key={s.title}>
          <h3>{s.title}</h3>
          <ol>
            {s.rows.map((r) => (
              <li key={r.id}>
                <span className="a-name">{rowName(r.id)}</span>
                <span className="a-date muted num">{fmtMonth(r.date)}</span>
                <span className="a-units">
                  {r.list.map((o) => mark(o.p, o.p.id + r.id, {
                    group: OUTCOME_GROUP[o.o] ?? "pipeline",
                    note: `${o.o}${o.p.tranches.length > 1 ? ` · offered ${o.p.tranches.length} times` : ""}`,
                    className: hot && hot === o.p.id ? "same" : hot ? "dim" : "",
                    onEnter: () => setHot(o.p.tranches.length > 1 ? o.p.id : null), onLeave: () => setHot(null),
                  }))}
                </span>
                <span className="a-count num"><b>{r.won}</b> of {r.list.length}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** A tranche's name within its section: "Tranche 5", "Phase XI", "Jan 2023", "2022, second round". */
function rowName(id: string): string {
  let m = /^(?:Centre|Offshore)-(?:T|EL)(\d+)$/.exec(id);
  if (m) return `Tranche ${m[1]}`;
  const rest = id.replace(/^[A-Z]{2}-/, "");
  if ((m = /^EL-Phase-(\w+)$/.exec(rest))) return `Exploration licence, phase ${m[1]}`;
  if ((m = /^EL-(\d{4})$/.exec(rest))) return `Exploration licence, ${m[1]}`;
  if ((m = /^Phase-(\w+)$/.exec(rest))) return `Phase ${m[1]}`;
  if ((m = /^(\d{4})-(\d{2})$/.exec(rest))) return fmtMonth(`${m[1]}-${m[2]}`);
  if ((m = /^(\d{4})-2nd$/.exec(rest))) return `${m[1]}, second round`;
  return rest.replace(/-/g, " ");
}
