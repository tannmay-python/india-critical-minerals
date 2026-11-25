import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCore, useData } from "../data/store";
import type { Mineral, MineralDetail, Project, ScoreDetail, VectorDef } from "../data/types";
import { Journey } from "../components/Journey";
import { useJourney } from "../journeys";
import { Radar } from "../components/Radar";
import { StageProjects } from "../components/StageProjects";
import { WhatToBuild } from "../components/WhatToBuild";
import { groupColor, inkOn } from "../lib/colors";
import { go, href, mineralHref } from "../lib/router";
import "./MineralPage.css";


export function MineralPage({ name }: { name: string }) {
  const core = useCore();
  const mineral = core.findMineral(name);
  const detail = useData<MineralDetail>(mineral ? `minerals/${mineral.name}.json` : null);
  const allProjects = useData<Project[]>("projects.json");
  const journey = useJourney(mineral?.name);

  const projects = useMemo(() => {
    if (!mineral || !allProjects) return [];
    return allProjects.filter((p) => p.tagged.includes(mineral.name) && p.confidence !== "low");
  }, [mineral, allProjects]);

  // the value chain's sources join the list at the foot of the page; the site's own records need no citation on the site
  const sources = useMemo(() => {
    const key = (s: { title: string; url?: string }) => [s.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), (s.url ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase()];
    const list: { title: string; url?: string }[] = (detail?.capability?.sourceList ?? []).map((s) => ({ title: s.title, url: s.url || undefined }));
    const seen = new Set(list.flatMap(key).filter(Boolean));
    for (const s of journey?.sources ?? []) {
      if (/^Takshashila, India Critical Minerals/.test(s.title) || key(s).some((k) => k && seen.has(k))) continue;
      list.push(s);
    }
    return list;
  }, [detail, journey]);

  // step through the minerals in alphabetical order, by the links in the bar or the arrow keys
  const order = useMemo(() => [...core.minerals].sort((a, b) => a.name.localeCompare(b.name)), [core.minerals]);
  const at = mineral ? order.findIndex((m) => m.name === mineral.name) : -1;
  const prev = at >= 0 ? order[(at - 1 + order.length) % order.length] : null;
  const next = at >= 0 ? order[(at + 1) % order.length] : null;
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey || (ev.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
      if (ev.key === "ArrowLeft" && prev) go(`/mineral/${encodeURIComponent(prev.name)}`);
      if (ev.key === "ArrowRight" && next) go(`/mineral/${encodeURIComponent(next.name)}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (!mineral) return <main className="wrap not-found"><h1>No such mineral</h1><p><a href={href("/explorer")}>All 51 minerals</a></p></main>;

  const group = core.group.get(mineral.group)!;
  const color = groupColor(mineral.group);
  const cap = detail?.capability ?? null;


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

      <section className="wrap mp-scores" aria-label="Scores">
        <figure className="mp-radar">
          <Radar vectors={core.vectors} series={[{ label: mineral.name, color, values: core.vectors.map((v) => mineral.v[v.key] / v.max), fill: true }]} />
          <figcaption>
            <p>A higher score means the mineral matters more or its supply is more exposed.</p>
          </figcaption>
        </figure>
        <ScoreList mineral={mineral} vectors={core.vectors} detail={detail?.vectors} />
      </section>

      <section className="wrap mp-section">
        <h2>Value chain</h2>
        {journey && <Journey journey={journey} color={color} />}
      </section>

      {projects.length > 0 && (
        <section className="wrap mp-section">
          <h2>Projects</h2>
          <StageProjects projects={projects} />
        </section>
      )}

      {cap && (
        <section className="wrap mp-section">
          <h2>What to build</h2>
          <WhatToBuild cap={cap} mineral={mineral} />
        </section>
      )}

      {sources.length > 0 && (
        <section className="wrap mp-section mp-sources">
          <h2>Sources</h2>
          <ol>
            {sources.map((s) => <li key={s.title}>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}</li>)}
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
