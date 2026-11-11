// One project's summary beside the map: what it is, where it stands, the key numbers, the sources.
// Follows the project map's own drawer (src/ui/drawer.ts there) field for field.
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Entity, Project } from "../data/types";
import { BAND_COLOR } from "../lib/colors";
import { concessionLabel, fmtDate, fmtInvestment, fmtNum, fmtQuantity, place, trancheLabel } from "../lib/format";
import { href, mineralHref } from "../lib/router";
import { useCore } from "../data/store";
import "./ProjectDrawer.css";

/** Source tiers in words a reader can weigh. */
export const TIER: Record<string, string> = { T1: "Official", T2: "Company", T3: "Press", T4: "Other", T5: "Other" };

export function seeAlsoLabel(u: string): string {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    return h === "fabs.pranaykotas.com" ? "India Semiconductor Tracker" : h;
  } catch { return u; }
}

const months = (m: number) => `${m} month${m === 1 ? "" : "s"}`;
/** The first dated target against what happened, in one line. */
export function promiseText(e: Entity): string {
  const p = e.promise;
  if (!p) return "";
  const due = fmtDate(p.due);
  const verb = p.restart ? "restarted" : "delivered";
  if (p.state === "delivered") return p.months > 0 ? `${due}; ${verb} ${fmtDate(p.done)}, ${months(p.months)} late` : `${due}; ${verb} ${fmtDate(p.done)}, on time`;
  if (p.state === "revised") return `${due}; now ${fmtDate(p.now)}, ${months(p.months)} later`;
  if (p.state === "overdue") return `${due}; not delivered, ${months(p.months)} past`;
  return due;
}

export function MineralChips({ names }: { names: string[] }) {
  const core = useCore();
  return <>{names.map((m) => (core.mineral.has(m) ? <a className="chip" key={m} href={mineralHref(m)}>{m}</a> : <span className="chip" key={m}>{m}</span>))}</>;
}

export function SourceList({ e }: { e: Entity }) {
  return (
    <ol className="sources">
      {e.sources.map((s) => (
        <li key={s.id}>
          <a href={s.url} target="_blank" rel="noopener">{s.title}</a>
          <span className="muted">
            <span className={`tier tier-${s.tier}`}>{TIER[s.tier] ?? ""}</span>
            {[s.publisher, fmtDate(s.date)].filter(Boolean).join(" · ")}
            {s.archive_url && <> · <a href={s.archive_url} target="_blank" rel="noopener">archived copy</a></>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function lastBidder(e: Entity): string {
  return [...(e.auction?.history ?? [])].reverse().find((o) => o.preferred_bidder)?.preferred_bidder ?? "";
}

export function ProjectDrawer({ e, light, names, onClose, onOpen }: {
  e: Entity; light: Project; names: Map<string, string>; onClose(): void; onOpen(id: string): void;
}) {
  const [copied, setCopied] = useState(false);
  const isBlock = e.layer === "blocks";
  const blk = e.block;
  const cap = fmtQuantity(e.capacity?.installed) || (fmtQuantity(e.capacity?.planned) ? `${fmtQuantity(e.capacity?.planned)} (planned)` : "");
  const os = e.overseas;
  const rows: [string, ReactNode][] = [
    ["Minerals", e.minerals.length ? <MineralChips names={e.minerals} /> : null],
    ["Indian holders", os?.indian_entities.join(", ")],
    ["Stake", os?.stake_pct != null ? `${fmtNum(os.stake_pct)}%` : null],
    ["Deal", os?.deal_type],
    [isBlock ? "Preferred bidder" : "Operator", isBlock ? lastBidder(e) : e.operator],
    ["Product", e.demand?.product],
    ["Concession", concessionLabel(blk?.concession_type)],
    ["Area", blk?.area_sq_km ? `${fmtNum(blk.area_sq_km)} sq km${blk.exploration_stage ? ` · ${blk.exploration_stage} exploration` : ""}` : null],
    ["Capacity", cap],
    ["Investment", fmtInvestment(e)],
    ["Location", place(e)],
    ["Promised", promiseText(e)],
    ["Schemes", e.scheme_links.length ? e.scheme_links.map((s) => <span key={s.id} className="line">{s.role === "bidder" ? `${s.name} (bidder)` : s.name}</span>) : null],
    ["Related", e.related.filter((id) => names.has(id)).length ? e.related.filter((id) => names.has(id)).map((id) => <button type="button" className="link line" key={id} onClick={() => onOpen(id)}>{names.get(id)}</button>) : null],
    ["More", e.see_also.length ? e.see_also.map((u) => <a className="line" key={u} href={u} target="_blank" rel="noopener">{seeAlsoLabel(u)}</a>) : null],
  ];
  const history = [...(e.auction?.history ?? [])].reverse();
  const milestones = e.milestones.filter((m) => m.date && m.event);

  return (
    <aside className="drawer" aria-labelledby="drawer-title">
      <div className="drawer-head">
        <span className="drawer-stage"><i className="swatch" style={{ "--c": BAND_COLOR[light.band] } as CSSProperties} />{e.stages.join(" · ")}</span>
        <button type="button" className="icon-btn" aria-label="Copy link to this record" title={copied ? "Copied" : "Copy link"}
          onClick={() => navigator.clipboard?.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {})}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <h2 id="drawer-title" tabIndex={-1}>{e.name}</h2>
      <p className="status"><strong>{e.status}</strong> <span className="muted">as of {fmtDate(e.status_as_of)}</span>{e.confidence === "low" && <span className="tag">Unconfirmed</span>}</p>
      {e.status_detail && <p className="status-detail">{e.status_detail}</p>}
      {e.narrative.what_it_does && <p className="lede">{e.narrative.what_it_does}</p>}
      {!isBlock && e.narrative.why_it_matters && <p className="why">{e.narrative.why_it_matters}</p>}
      <a className="pill profile-link" href={href(`/project/${e.id}`)}>Full record</a>
      <dl className="facts">
        {rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {isBlock && history.length > 0 && (
        <>
          <h3>Auction history</h3>
          <ol className="trail">
            {history.map((o, i) => (
              <li key={i}>
                <span className="muted num">{fmtDate(o.outcome_date ?? o.nit_date)}</span>
                <span><b>{trancheLabel(o.tranche)}</b> {o.outcome}{o.preferred_bidder ? `: ${o.preferred_bidder}` : ""}{o.preferred_bidder && o.final_offer_pct !== null ? ` (${fmtNum(o.final_offer_pct)}%)` : ""}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      {!isBlock && milestones.length > 0 && (
        <>
          <h3>Milestones</h3>
          <ol className="trail">{milestones.map((m, i) => <li key={i}><span className="muted num">{fmtDate(m.date)}</span><span>{m.event}</span></li>)}</ol>
        </>
      )}
      <h3>Sources</h3>
      <SourceList e={e} />
    </aside>
  );
}
