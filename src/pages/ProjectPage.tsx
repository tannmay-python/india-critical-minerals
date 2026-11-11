// One project's full record, after the project map's profile page (src/ui/profile.ts there), which
// was itself modelled on the facility pages of the India Semiconductor Tracker: what it is, the
// facts an investor asks about, the first promise against delivery, a dated timeline, every source.
// Rows appear only where the data has a sourced value.
import { type CSSProperties, type ReactNode } from "react";
import { useData } from "../data/store";
import type { Entity, Project } from "../data/types";
import { MineralChips, SourceList, TIER, seeAlsoLabel } from "../components/ProjectDrawer";
import { BAND_COLOR } from "../lib/colors";
import { concessionLabel, fmtDate, fmtInvestment, fmtNum, fmtQuantity, place, trancheLabel } from "../lib/format";
import { href } from "../lib/router";
import "./ProjectPage.css";

const LAYER_LABEL: Record<string, string> = {
  mines: "Mine", processing: "Processing and refining", materials: "Battery materials", magnets: "Rare earths and magnets",
  rnd: "Research", overseas: "Asset abroad", demand: "Cell plant or fab", blocks: "Auction block", recycling: "Recycling",
};
const ROLE: Record<string, string> = { technology: "technology partner", jv: "joint-venture partner", offtake: "offtaker", epc: "builder (EPC)", finance: "financier", supply: "supplier" };
const FEEDSTOCK_SKIP = new Set(["Not applicable", "Unknown"]);
const DATE_EVENT: [string, string][] = [
  ["announced", "Announced"], ["mou", "MoU signed"], ["approved", "Approved"], ["construction_start", "Construction begins"],
  ["commissioned", "Commissioned"], ["closed", "Closed"], ["reopened", "Restarted"],
];
const ISSUES = "https://github.com/tannmay-python/india-critical-minerals-map/issues/new";
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const Note = ({ children }: { children: ReactNode }) => (children ? <span className="muted"> {children}</span> : null);
const plural = (m: number) => `${m} month${m === 1 ? "" : "s"}`;

export function ProjectPage({ id }: { id: string }) {
  const details = useData<Record<string, Entity>>("project-details.json");
  const all = useData<Project[]>("projects.json");
  if (!details || !all) return <main className="wrap record" />;
  const e = details[id];
  const light = all.find((p) => p.id === id);
  if (!e || !light) return <main className="wrap record"><h1>No such record</h1><p><a href={href("/projects")}>All projects</a></p></main>;

  const os = e.overseas;
  const blk = e.block;
  const inst = fmtQuantity(e.capacity?.installed);
  const plan = fmtQuantity(e.capacity?.planned);
  const feed = e.feedstock && !FEEDSTOCK_SKIP.has(e.feedstock) ? e.feedstock : "";
  const funding = e.rnd?.funding;
  const partners = new Map<string, { country?: string; roles: string[] }>();
  for (const p of e.partners ?? []) {
    const cur = partners.get(p.name) ?? { country: p.country, roles: [] };
    if (p.role) cur.roles.push(ROLE[p.role] ?? p.role);
    partners.set(p.name, cur);
  }
  const lines = (items: ReactNode[]) => (items.length ? items.map((x, i) => <span className="line" key={i}>{x}</span>) : null);
  const rows: [string, ReactNode][] = [
    ["Minerals", e.minerals.length ? <span className="chips"><MineralChips names={e.minerals} /></span> : null],
    ["Step in the chain", e.stages.join(" · ")],
    ["Products", (e.products ?? []).join(", ") || e.demand?.product || null],
    ["Inputs", sameSet(e.demand?.inputs ?? [], e.minerals) ? null : (e.demand?.inputs ?? []).join(", ")],
    ["Capacity", lines([inst && <>{inst}<Note>installed</Note></>, plan && <>{plan}<Note>planned{e.capacity?.planned?.phase ? `, ${e.capacity.planned.phase}` : ""}</Note></>, !inst && !plan && e.demand?.capacity_gwh ? `${fmtNum(e.demand.capacity_gwh)} GWh` : null].filter(Boolean))],
    ["Investment", fmtInvestment(e) ? <>{fmtInvestment(e)}<Note>{e.investment?.basis}</Note></> : null],
    ["Operator", e.operator ? <>{e.operator}<Note>{e.operator_type}</Note></> : null],
    ["Owners", lines((e.owners ?? []).map((o) => `${o.entity}${o.stake_pct != null ? ` ${fmtNum(o.stake_pct)}%` : ""}`))],
    ["Indian holders", os?.indian_entities.join(", ")],
    ["Stake", os?.stake_pct != null ? `${fmtNum(os.stake_pct)}%` : null],
    ["Deal", os?.deal_type],
    ["Partners", lines([...partners].map(([name, v]) => <>{name}{v.country && v.country !== "India" ? ` (${v.country})` : ""}<Note>{v.roles.join(", ")}</Note></>))],
    ["Feedstock", feed || e.feedstock_detail ? <>{feed || e.feedstock_detail}{feed && e.feedstock_detail ? <Note>{e.feedstock_detail}</Note> : null}</> : null],
    ["Government support", lines(e.scheme_links.map((s) => <>{s.name}<Note>{[s.role === "bidder" ? "bidder" : "", e.scheme_status[s.id] ?? ""].filter(Boolean).join(", ")}</Note></>))],
    ["Institution", e.rnd?.institution_type],
    ["Research focus", (e.rnd?.focus ?? []).join("; ")],
    ["Funding", funding && (funding.amount || funding.funder) ? [funding.amount ? `${fmtNum(funding.amount)} ${funding.currency ?? ""}`.trim() : "", funding.funder ?? ""].filter(Boolean).join(" · ") : null],
    ["Concession", concessionLabel(blk?.concession_type)],
    ["Area", blk?.area_sq_km ? `${fmtNum(blk.area_sq_km)} sq km${blk.exploration_stage ? ` · ${blk.exploration_stage} exploration` : ""}` : null],
    ["Location", place(e)],
  ];

  // timeline: milestones plus the dated fields that are events
  const src = new Map(e.sources.map((s) => [s.id, s]));
  const supporting = (field: string) => e.sources.find((s) => s.supports?.includes(`dates.${field}`));
  const items = e.milestones.filter((m) => m.date && m.event).map((m) => ({ date: m.date, event: m.event, source: m.source_id ? src.get(m.source_id) : undefined }));
  const taken = new Set(items.map((i) => i.date));
  for (const [field, label] of DATE_EVENT) {
    const d = e.dates[field];
    if (d && !taken.has(d)) { items.push({ date: d, event: label, source: supporting(field) }); taken.add(d); }
  }
  const first = e.dates.first_public;
  if (first && !taken.has(first) && !items.some((i) => i.date < first)) items.push({ date: first, event: "First public record", source: supporting("first_public") });
  items.sort((a, b) => a.date.localeCompare(b.date));
  const history = e.auction?.history ?? [];
  const related = e.related.map((rid) => details[rid]).filter(Boolean);
  const issue = `${ISSUES}?title=${encodeURIComponent(`Correction: ${e.name}`)}&body=${encodeURIComponent(`Record: ${e.id}\n\nWhat should change, with a source:\n`)}`;

  return (
    <main className="record wrap">
      <article>
        <p className="record-kind"><i className="swatch" style={{ "--c": BAND_COLOR[light.band] } as CSSProperties} />{LAYER_LABEL[e.layer] ?? e.layer}</p>
        <h1>{e.name}</h1>
        {e.operator && <p className="record-sub">{e.operator}</p>}
        <p className="status"><strong>{e.status}</strong> <span className="muted">as of {fmtDate(e.status_as_of)}</span>{e.confidence === "low" && <span className="tag">Unconfirmed</span>}</p>
        {e.status_detail && <p className="status-detail">{e.status_detail}</p>}
        {e.narrative.what_it_does && <p className="lede">{e.narrative.what_it_does}</p>}
        {e.narrative.why_it_matters && <p className="why">{e.narrative.why_it_matters}</p>}

        <table className="facts-table">
          <tbody>
            {rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
          </tbody>
        </table>

        {e.promise && <Promise e={e} />}

        {history.length > 0 && (
          <>
            <h2>Auction history</h2>
            <ol className="timeline">
              {history.map((o, i) => (
                <li key={i}>
                  <time className="num">{fmtDate(o.outcome_date ?? o.nit_date)}</time>
                  <div><p><b>{trancheLabel(o.tranche)}.</b> {o.outcome}{o.preferred_bidder ? `: ${o.preferred_bidder}` : ""}{o.preferred_bidder && o.final_offer_pct !== null ? ` (${fmtNum(o.final_offer_pct)}%)` : ""}</p>{o.annulment_reason && <span className="muted">{o.annulment_reason}</span>}</div>
                </li>
              ))}
            </ol>
          </>
        )}

        {items.length > 0 && (
          <>
            <h2>Timeline</h2>
            <ol className="timeline">
              {items.map((i, n) => (
                <li key={n}>
                  <time className="num">{fmtDate(i.date)}</time>
                  <div>
                    <p>{i.event}</p>
                    {i.source && <a className="muted" href={i.source.url} target="_blank" rel="noopener"><span className={`tier tier-${i.source.tier}`}>{TIER[i.source.tier] ?? ""}</span>{i.source.publisher || i.source.title}</a>}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        {related.length > 0 && (
          <>
            <h2>Related</h2>
            <ul className="plain">{related.map((r) => <li key={r.id}><a href={href(`/project/${r.id}`)}>{r.name}</a> <span className="muted">{LAYER_LABEL[r.layer] ?? ""} · {r.status}</span></li>)}</ul>
          </>
        )}
        {e.see_also.length > 0 && (
          <>
            <h2>Elsewhere</h2>
            <ul className="plain">{e.see_also.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener">{seeAlsoLabel(u)}</a></li>)}</ul>
          </>
        )}

        <h2>Sources</h2>
        <SourceList e={e} />
        <p className="record-foot muted">
          Checked {fmtDate(e.last_verified)}. <a href={href("/projects", { id: e.id })}>Show on the map</a> · <a href={issue} target="_blank" rel="noopener">Suggest a correction</a>
        </p>
      </article>
    </main>
  );
}

/** The first dated target against what happened, drawn on one line of time. */
function Promise({ e }: { e: Entity }) {
  const p = e.promise!;
  const verdict = p.state === "delivered" ? (p.months > 0 ? `${plural(p.months)} late` : "On time")
    : p.state === "revised" ? `Moved ${plural(p.months)} later`
      : p.state === "overdue" ? `${plural(p.months)} past the first date, not delivered` : "Not yet due";
  const tone = p.state === "pending" ? "pending" : p.state === "overdue" ? "bad" : p.state === "delivered" && p.months <= 0 ? "good" : "late";
  const t = (s: string) => { const [y, m = "7", d = "1"] = s.split("-"); return Date.UTC(Number(y), Number(m) - 1, Number(d)); };
  const points = [
    { label: "First promised", date: p.due, kind: "due" },
    ...(p.now ? [{ label: p.state === "delivered" ? "Revised to" : "Now due", date: p.now, kind: "now" }] : []),
    ...(p.done ? [{ label: p.restart ? "Restarted" : "Delivered", date: p.done, kind: "done" }] : []),
  ];
  const times = points.map((x) => t(x.date));
  const lo = Math.min(...times), hi = Math.max(...times);
  const pos = (x: string) => (hi === lo ? 0 : ((t(x) - lo) / (hi - lo)) * 100);
  return (
    <>
      <h2>Promised and delivered</h2>
      <div className={`promise tone-${tone}`}>
        <p className="verdict">{verdict}</p>
        <div className="promise-track">
          {points.length > 1 && <i className="promise-gap" style={{ left: "0%", width: "100%" }} />}
          {points.map((x) => (
            <span key={x.kind} className={`promise-point ${x.kind}${x.kind === "now" && points.some((o) => o !== x && Math.abs(pos(o.date) - pos(x.date)) < 24) ? " above" : ""}`} style={{ left: `${pos(x.date)}%` }}>
              <i /><b className="num">{fmtDate(x.date)}</b><small>{x.label}</small>
            </span>
          ))}
        </div>
        {!p.done && <p className="muted promise-open">{p.restart ? "Not yet restarted" : "Not yet delivered"}</p>}
      </div>
      <p className="muted record-note">"First promised" is the earliest dated target found in the sources, which may itself be a revision.</p>
    </>
  );
}
