import { useMemo, useState, type CSSProperties } from "react";
import { useCore, useData } from "../data/store";
import type { Mineral, MineralDetail, Project, ScoreDetail, VectorDef } from "../data/types";
import { Chain } from "../components/Chain";
import { Mark } from "../components/ProjectMark";
import { Radar } from "../components/Radar";
import { groupColor, inkOn } from "../lib/colors";
import { fmtDate, fmtRange } from "../lib/format";
import { href } from "../lib/router";
import "./MineralPage.css";

const LAYER_RANK: Record<string, number> = { mines: 0, processing: 1, materials: 2, magnets: 3, overseas: 4, rnd: 5, demand: 6, blocks: 7, recycling: 8 };
const GROUP_RANK = { active: 0, pipeline: 1, inactive: 2 } as const;
const LIST_LIMIT = 12;

export function MineralPage({ name }: { name: string }) {
  const core = useCore();
  const mineral = core.findMineral(name);
  const detail = useData<MineralDetail>(mineral ? `minerals/${mineral.name}.json` : null);
  const allProjects = useData<Project[]>("projects.json");

  const projects = useMemo(() => {
    if (!mineral || !allProjects) return [];
    return allProjects.filter((p) => p.minerals.includes(mineral.name) && p.confidence !== "low");
  }, [mineral, allProjects]);

  if (!mineral) return <main className="wrap not-found"><h1>No such mineral</h1><p><a href={href("/")}>All 51 minerals</a></p></main>;

  const group = core.group.get(mineral.group)!;
  const color = groupColor(mineral.group);
  const peers = core.membersOf(mineral.group);
  const mean = core.vectors.map((v) => peers.reduce((s, m) => s + m.v[v.key], 0) / peers.length / v.max);
  const listed = [...projects].sort((a, b) => (LAYER_RANK[a.layer] ?? 9) - (LAYER_RANK[b.layer] ?? 9) || GROUP_RANK[a.group] - GROUP_RANK[b.group] || a.name.localeCompare(b.name));
  const cap = detail?.capability ?? null;

  return (
    <main className="mineral-page">
      <header className="wrap mp-head">
        <span className="mp-tile" style={{ background: color, color: inkOn(color) }}><small className="num">{mineral.z}</small>{mineral.symbol}</span>
        <div>
          <h1>{mineral.name}</h1>
          <a className="mp-group" href={href(`/groups/${group.id}`)}><i className="swatch" style={{ "--c": color } as CSSProperties} />{group.name}</a>
        </div>
        <a className="pill mp-compare" href={href("/compare", { m: mineral.name })}>Compare</a>
      </header>

      <section className="wrap mp-scores" aria-label="Scores">
        <figure className="mp-radar">
          <Radar vectors={core.vectors} series={[
            ...(peers.length > 1 ? [{ label: `${group.name}, average`, color: "#b79f6b", values: mean }] : []),
            { label: mineral.name, color, values: core.vectors.map((v) => mineral.v[v.key] / v.max), fill: true },
          ]} />
          {peers.length > 1 && (
            <figcaption>
              <span><i className="key-line" style={{ background: color }} />{mineral.name}</span>
              <span><i className="key-line" style={{ background: "#b79f6b" }} />Group average</span>
            </figcaption>
          )}
        </figure>
        <ScoreList mineral={mineral} vectors={core.vectors} detail={detail?.vectors} />
      </section>

      <section className="wrap mp-section">
        <h2>Value chain</h2>
        <Chain mineral={mineral} stages={cap?.stages ?? null} projects={projects} />
      </section>

      {projects.length > 0 && (
        <section className="wrap mp-section">
          <h2>Projects</h2>
          <ul className="mp-projects">
            {listed.slice(0, LIST_LIMIT).map((p) => (
              <li key={p.id}>
                <Mark kind={p.kind} band={p.band} group={p.group} size={12} />
                <a href={href(`/project/${p.id}`)}>{p.name}</a>
                <span className="mp-p-stage">{p.stage}</span>
                <span className="mp-p-status">{p.status}<small> {fmtDate(p.asOf)}</small></span>
                <span className="mp-p-place">{p.abroad ? p.country : [p.district, p.state].filter(Boolean).join(", ")}</span>
              </li>
            ))}
          </ul>
          <p className="mp-more">
            <a href={href("/projects", { mineral: mineral.name })}>{projects.length > LIST_LIMIT ? `All ${projects.length} on the map` : "See them on the map"}</a>
          </p>
        </section>
      )}

      {cap && (
        <section className="wrap mp-section mp-build">
          <h2>What to build</h2>
          <p className="mp-lead">{cap.next_move}</p>
          <div className="mp-build-grid">
            <div className="mp-has">
              <h3>What India already has</h3>
              <p>{cap.what_india_has}</p>
              {cap.kinds.filter((k) => k !== "None").length > 0 && <p className="mp-kinds">{cap.kinds.filter((k) => k !== "None").map((k) => <span className="chip" key={k}>{k}</span>)}</p>}
            </div>
            <dl className="mp-facts">
              <div><dt>Capability</dt><dd>{cap.value_chain_step}</dd></div>
              <div><dt>Complexity</dt><dd><span className="pips" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= cap.complexity ? "on" : ""} />)}</span> {cap.complexity} of 5</dd></div>
              <div><dt>Ease for India</dt><dd>{cap.ease}</dd></div>
              <div><dt>Time to output</dt><dd>{fmtRange(cap.time_to_output)}</dd></div>
              <div><dt>Confidence</dt><dd>{cap.confidence}</dd></div>
              <div className="wide"><dt>Indicative cost</dt><dd>{cap.cost}</dd></div>
            </dl>
          </div>

          {cap.strategyList.length > 0 && (
            <div className="mp-links">
              <h3>{cap.strategyList.length === 1 ? "The capability it needs" : "Capabilities it needs"}</h3>
              <ul>
                {cap.strategyList.map((s) => (
                  <li key={s.id}><a href={href(`/capability/${s.slug}`)}>{s.name}</a><p>{s.what}</p></li>
                ))}
              </ul>
            </div>
          )}
          {cap.chemistryList.length > 0 && (
            <div className="mp-links">
              <h3>Chemistry India already has</h3>
              <ul>
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
        <div className="score-family" key={fam}>
          <h3>{fam}</h3>
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
