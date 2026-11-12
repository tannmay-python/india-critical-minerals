import { Fragment, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useCore, useData } from "../data/store";
import type { Capability, Mineral, MineralDetail, Project, ScoreDetail, VectorDef } from "../data/types";
import { CHAIN_COLUMNS, Chain } from "../components/Chain";
import { Journey } from "../components/Journey";
import { useJourney } from "../journeys";
import { Mark } from "../components/ProjectMark";
import { Radar } from "../components/Radar";
import { fixLinks } from "../content/groups";
import { groupColor, inkOn } from "../lib/colors";
import { fmtRange } from "../lib/format";
import { go, href, mineralHref } from "../lib/router";
import "./MineralPage.css";

const GROUP_RANK = { active: 0, pipeline: 1, inactive: 2 } as const;
const PER_STAGE = 4;

export function MineralPage({ name }: { name: string }) {
  const core = useCore();
  const mineral = core.findMineral(name);
  const detail = useData<MineralDetail>(mineral ? `minerals/${mineral.name}.json` : null);
  const allProjects = useData<Project[]>("projects.json");
  const capability = useData<Capability>(mineral?.capability ? "capability.json" : null);
  const journey = useJourney(mineral?.name);

  const projects = useMemo(() => {
    if (!mineral || !allProjects) return [];
    return allProjects.filter((p) => p.tagged.includes(mineral.name) && p.confidence !== "low");
  }, [mineral, allProjects]);

  // step through the minerals in alphabetical order, by the links in the bar or the arrow keys
  const order = useMemo(() => [...core.minerals].sort((a, b) => a.name.localeCompare(b.name)), [core.minerals]);
  const at = mineral ? order.findIndex((m) => m.name === mineral.name) : -1;
  const prev = at >= 0 ? order[(at - 1 + order.length) % order.length] : null;
  const next = at >= 0 ? order[(at + 1) % order.length] : null;
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey || (ev.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
      if (ev.key === "ArrowLeft" && prev) go(`/mineral/${encodeURIComponent(prev.name)}`);
      if (ev.key === "ArrowRight" && next) go(`/mineral/${encodeURIComponent(next.name)}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (!mineral) return <main className="wrap not-found"><h1>No such mineral</h1><p><a href={href("/explorer")}>All 51 minerals</a></p></main>;

  const group = core.group.get(mineral.group)!;
  const color = groupColor(mineral.group);
  const peers = core.membersOf(mineral.group);
  const mean = core.vectors.map((v) => peers.reduce((s, m) => s + m.v[v.key], 0) / peers.length / v.max);
  const cap = detail?.capability ?? null;
  const inIndia = projects.filter((p) => !p.abroad && p.kind !== "demand").length;
  const abroad = projects.filter((p) => p.abroad).length;
  const shared = mineral.projects.shared;
  const familyName = mineral.projects.family === "PGE" ? "platinum-group" : "rare-earth";

  /** "(#6)" in the cost text points at capability number 6; show it as a link by name. */
  const withCapabilityLinks = (text: string): ReactNode => text.split(/\s*\(#(\d+)\)/).map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const s = capability?.strategies.find((x) => x.number === Number(part));
    return s ? <Fragment key={i}> (<a href={href(`/capability/${s.slug}`)}>{s.name}</a>)</Fragment> : null;
  });

  return (
    <main className="mineral-page">
      <nav className="wrap mp-step" aria-label="Minerals">
        <a href={href("/explorer")}>All minerals</a>
        {prev && <a className="prev" href={mineralHref(prev.name)} rel="prev">{prev.name}</a>}
        {next && <a className="next" href={mineralHref(next.name)} rel="next">{next.name}</a>}
      </nav>
      <header className="wrap mp-head">
        <span className="mp-tile" style={{ background: color, color: inkOn(color) }}><small className="num">{mineral.z}</small>{mineral.symbol}</span>
        <div>
          <h1>{mineral.name}</h1>
          <a className="mp-group" href={href(`/groups/${group.id}`)}><i className="swatch" style={{ "--c": color } as CSSProperties} /><b>{group.name}</b>{group.tagline && <span>{group.tagline}</span>}</a>
        </div>
        <a className="pill mp-compare" href={href("/compare", { m: mineral.name })}>Compare</a>
      </header>
      {mineral.capability && <div className="wrap"><p className="mp-lead">{mineral.capability.nextMove}</p></div>}

      <section className="wrap mp-scores" aria-label="Scores">
        <figure className="mp-radar">
          <Radar vectors={core.vectors} series={[
            ...(peers.length > 1 ? [{ label: `${group.name}, average`, color: "#b79f6b", values: mean }] : []),
            { label: mineral.name, color, values: core.vectors.map((v) => mineral.v[v.key] / v.max), fill: true },
          ]} />
          <figcaption>
            {peers.length > 1 && <p className="mp-key"><span><i className="key-line" style={{ background: color }} />{mineral.name}</span><span><i className="key-line" style={{ background: "#b79f6b" }} />Group average</span></p>}
            <p>A higher score means the mineral matters more or its supply is more exposed.</p>
          </figcaption>
        </figure>
        <ScoreList mineral={mineral} vectors={core.vectors} detail={detail?.vectors} />
      </section>

      <section className="wrap mp-section">
        <h2>Value chain</h2>
        {journey && <Journey journey={journey} color={color} />}
        <Chain mineral={mineral} stages={cap?.stages ?? null} projects={projects} />

        {projects.length > 0 && (
          <div className="mp-stage-lists">
            {CHAIN_COLUMNS.map((c) => {
              const list = projects.filter((p) => p.band === c.band).sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group] || Number(a.kind === "block") - Number(b.kind === "block") || a.name.localeCompare(b.name));
              if (!list.length) return null;
              return (
                <div key={c.id}>
                  <h3>{c.label}<span className="num">{list.length}</span></h3>
                  <ul>
                    {list.slice(0, PER_STAGE).map((p) => (
                      <li key={p.id}>
                        <Mark kind={p.kind} band={p.band} group={p.group} size={11} />
                        <span><a href={href(`/project/${p.id}`)}>{p.name}</a><small>{p.status}{p.abroad && p.country ? ` · ${p.country}` : p.state ? ` · ${p.state}` : ""}</small></span>
                      </li>
                    ))}
                  </ul>
                  {list.length > PER_STAGE && <p className="mp-rest num">and {list.length - PER_STAGE} more</p>}
                </div>
              );
            })}
          </div>
        )}
        <p className="mp-more">
          {inIndia > 0 && <a href={href("/projects", { mineral: mineral.name })}>{inIndia} in India on the map</a>}
          {abroad > 0 && <a href={href("/projects", { view: "abroad", mineral: mineral.name })}>{abroad} abroad</a>}
          {shared > 0 && <a href={href("/projects", { mineral: `family:${mineral.projects.family}` })}>{shared} {familyName} projects that name no single element</a>}
          {projects.length === 0 && shared === 0 && <span className="muted">No Indian project is recorded for {mineral.name.toLowerCase()}.</span>}
        </p>
      </section>

      {cap && (
        <section className="wrap mp-section mp-build">
          <h2>What to build</h2>
          <div className="mp-build-grid">
            <div className="mp-has">
              <h3>What India already has</h3>
              <p>{cap.what_india_has}</p>
            </div>
            <dl className="mp-facts">
              <div><dt>Capability</dt><dd>{cap.value_chain_step}</dd></div>
              <div><dt>Complexity</dt><dd><span className="pips" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= cap.complexity ? "on" : ""} />)}</span> {cap.complexity} of 5</dd></div>
              <div><dt>Ease for India</dt><dd>{cap.ease}</dd></div>
              <div><dt>Time to output</dt><dd>{fmtRange(cap.time_to_output)}</dd></div>
              <div><dt>Confidence</dt><dd>{cap.confidence}</dd></div>
              <div className="wide"><dt>Indicative cost</dt><dd><span>{withCapabilityLinks(cap.cost)}</span></dd></div>
            </dl>
          </div>

          {(cap.strategyList.length > 0 || cap.chemistryList.length > 0) && (
            <div className="mp-links">
              <ul>
                {cap.strategyList.map((s) => (
                  <li key={s.id}><a href={href(`/capability/${s.slug}`)}>{s.name}</a><p>{s.what}</p></li>
                ))}
                {cap.chemistryList.map((k) => (
                  <li key={k.id}>
                    <a href={href(`/technology/${k.slug}`)}>{k.name}</a>
                    <p>{(k.links[0] as { how?: string } | undefined)?.how ?? k.carries_over_to}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="wrap mp-section mp-group-advice">
        <h2>{group.id === 0 ? group.name : `${group.name}: what India should do`}</h2>
        <div className="mp-advice-grid">
          <div>
            {group.policy.length > 0
              ? <ul className="mp-policy">{group.policy.map((p, i) => <li key={i}>{p}</li>)}</ul>
              : <div className="prose">{(group.body ?? "").split(/\n\s*\n/).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: fixLinks(p) }} />)}</div>}
          </div>
          {peers.length > 1 && (
            <div className="mp-peers">
              {peers.map((m) => <a key={m.name} href={mineralHref(m.name)} title={m.name} aria-current={m.name === mineral.name ? "page" : undefined} style={{ background: color, color: inkOn(color) }}>{m.symbol}</a>)}
            </div>
          )}
        </div>
      </section>

      {cap && cap.sourceList.length > 0 && (
        <section className="wrap mp-section mp-sources">
          <h2>Sources</h2>
          <ol>
            {cap.sourceList.map((s) => <li key={s.id}>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}</li>)}
          </ol>
        </section>
      )}
    </main>
  );
}

function ScoreList({ mineral, vectors, detail }: { mineral: Mineral; vectors: VectorDef[]; detail?: Record<string, ScoreDetail> }) {
  const [open, setOpen] = useState<string | null>(null);
  const families = [...new Set(vectors.map((v) => v.family))];
  return (
    <div className="scores">
      {families.map((fam) => (
        <div className="score-family" key={fam} role="group" aria-label={fam}>
          {vectors.filter((v) => v.family === fam).map((v) => {
            const value = mineral.v[v.key];
            const d = detail?.[v.key];
            const isOpen = open === v.key;
            return (
              <div className={`score${isOpen ? " open" : ""}`} key={v.key}>
                <button type="button" aria-expanded={isOpen} aria-controls={`reason-${v.key}`} onClick={() => setOpen(isOpen ? null : v.key)}>
                  <span className="score-name">{v.name}</span>
                  <span className="score-bar" aria-hidden="true"><i style={{ width: `${(value / v.max) * 100}%` }} /></span>
                  <span className="score-val num">{value}<small>/{v.max}</small></span>
                  <span className="score-caret" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="score-reason" id={`reason-${v.key}`}>
                    {d?.sub && v.sub && (
                      <p className="score-subs">
                        {v.sub.map((s) => <span key={s.key}>{s.name} <b className="num">{d.sub![s.key]}</b><small>/{s.max}</small></span>)}
                      </p>
                    )}
                    {d ? paragraphs(d.reason) : <p className="muted">Loading…</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** The reasons are written as short labelled paragraphs ("Mining: ..."); keep the breaks and set the labels apart. */
function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p, i) => {
    const m = /^([A-Z][A-Za-z0-9 &'’()/-]{2,44}):\s+([\s\S]*)$/.exec(p);
    return m ? <p key={i}><b>{m[1]}.</b> {m[2]}</p> : <p key={i}>{p}</p>;
  });
}
