// Method: how minerals are scored and grouped, what the project records cover, how the capability
// entries are scaled, and who made this. The prose is the authors', carried over from the three
// sources (see src/content).
import { useState, type CSSProperties } from "react";
import { useCore, useData } from "../data/store";
import type { Capability } from "../data/types";
import { Dendrogram } from "../components/Dendrogram";
import { Mark } from "../components/ProjectMark";
import { Radar } from "../components/Radar";
import { GROUPING_METHOD, METHOD_INTRO, METHOD_NOTE, NO_COMPOSITE, NO_COMPOSITE_MINERALS, SCORE_SOURCES, TREE_TEXT } from "../content/groups";
import { AUTHORS } from "../content/home";
import { BAND_NOTE, BOUNDARY_NOTE, LAYERS, LEFT_OUT, PROJECTS_LEDE, SHAPE_KEY, STATUS_KEY, YEAR_NOTE } from "../content/projects";
import { groupColor } from "../lib/colors";
import { fmtDate } from "../lib/format";
import { href } from "../lib/router";
import "./MethodPage.css";

const SECTIONS = [["scoring", "Scoring"], ["grouping", "Grouping"], ["projects", "Projects"], ["capabilities", "Capabilities"], ["credits", "Credits and data"]] as const;
const COMPARE_COLORS = ["#620d3c", "#f1a222", "#1d677f"];
const SCALE_NOTES = ["Complexity", "Ease for India", "Time to output", "Confidence", "Kind of strength", "Costs", "Our estimates", "Context"];

export function MethodPage() {
  const core = useCore();
  const cap = useData<Capability>("capability.json");
  const agg = useData<{ by_layer: Record<string, number> }>("aggregates.json");
  const [open, setOpen] = useState<string | null>(null);
  const trio = NO_COMPOSITE_MINERALS.map((n) => core.mineral.get(n)!).filter(Boolean);
  const data = `${import.meta.env.BASE_URL}data/downloads/`;

  return (
    <main className="wrap method">
      <nav className="method-nav" aria-label="On this page">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{label}</a>)}
      </nav>

      <div className="method-body">
        <section id="scoring">
          <h1>How each mineral is scored</h1>
          <p className="method-lede">{METHOD_INTRO}</p>

          <div className="no-composite">
            <div>
              <p dangerouslySetInnerHTML={{ __html: NO_COMPOSITE }} />
              <ul className="legend">
                {trio.map((m, i) => <li key={m.name}><i className="key-line" style={{ background: COMPARE_COLORS[i] }} /><a href={href(`/mineral/${m.name}`)}>{m.name}</a></li>)}
              </ul>
            </div>
            <Radar vectors={core.vectors} size={250} series={trio.map((m, i) => ({ label: m.name, color: COMPARE_COLORS[i], values: core.vectors.map((v) => m.v[v.key] / v.max) }))} />
          </div>

          <div className="vectors">
            {[...new Set(core.vectors.map((v) => v.family))].map((fam) => (
              <div className="vector-family" key={fam}>
                <h3>{fam}</h3>
                {core.vectors.filter((v) => v.family === fam).map((v) => {
                  const subs = core.subscores.filter((s) => s.vector === v.key);
                  const isOpen = open === v.key;
                  return (
                    <div className={`vector${isOpen ? " open" : ""}`} key={v.key}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : v.key)}>
                        <span className="vector-name">{v.name}<small className="num"> /{v.max}</small></span>
                        <span className="vector-what">{v.what}</span>
                        <span className="score-caret" aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <div className="vector-bands">
                          {subs.map((s) => (
                            <div key={s.i}>
                              {subs.length > 1 && <h4>{s.name}<small className="num"> /{s.max}</small></h4>}
                              {s.bands ? (
                                <table><tbody>{s.bands.map((b) => <tr key={b.score}><th className="num">{b.score}</th><td>{b.label}</td><td className="muted">{b.note}</td></tr>)}</tbody></table>
                              ) : <p className="muted">{s.note}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="prose method-note">{METHOD_NOTE.map((p, i) => <p key={i}>{p}</p>)}<p className="muted">{SCORE_SOURCES}</p></div>
        </section>

        <section id="grouping">
          <h2>How the groups were formed</h2>
          <div className="method-blocks">
            {GROUPING_METHOD.map((b) => <article key={b.title}><h3>{b.title}</h3><p dangerouslySetInnerHTML={{ __html: b.text }} /></article>)}
          </div>
          <p className="method-text">{TREE_TEXT.how}</p>
          <Dendrogram />
          <ul className="legend tree-key">
            {core.groups.filter((g) => g.id !== 0).map((g) => <li key={g.id}><i className="swatch" style={{ "--c": groupColor(g.id) } as CSSProperties} />{g.name}</li>)}
            <li><i className="swatch" style={{ "--c": "#cdbfa6" } as CSSProperties} />Joins across groups</li>
          </ul>
          <div className="prose"><p>{TREE_TEXT.read}</p><p>{TREE_TEXT.promethium}</p></div>
          <p className="method-more"><a href={href("/groups")}>The six groups and their average profiles</a></p>
        </section>

        <section id="projects">
          <h2>What the project records cover</h2>
          <p className="method-text">{PROJECTS_LEDE}</p>
          <table className="layers">
            <tbody>
              {LAYERS.map((l) => <tr key={l.id}><th scope="row">{l.label}</th><td className="num">{agg?.by_layer[l.id] ?? ""}</td><td>{l.what}</td></tr>)}
            </tbody>
          </table>
          <div className="keys">
            <ul>{core.bands.map((b) => <li key={b.id}><i className="swatch" style={{ "--c": b.color } as CSSProperties} /><span>{b.label}<span className="muted"> · {BAND_NOTE[b.id]}</span></span></li>)}</ul>
            <ul>
              {STATUS_KEY.map((s) => <li key={s.group}><Mark kind="site" band="demand" group={s.group} size={12} /><span>{s.text}</span></li>)}
              {SHAPE_KEY.map((s) => <li key={s.kind}><Mark kind={s.kind} band="demand" group="active" size={12} /><span>{s.text}</span></li>)}
            </ul>
          </div>
          <div className="prose"><p>{YEAR_NOTE}</p><p>{LEFT_OUT}</p></div>
        </section>

        <section id="capabilities">
          <h2>How the capability entries are scaled</h2>
          {cap && (
            <>
              <p className="method-text">{cap.meta.notes.find((n) => n.title === "About")?.text}</p>
              <dl className="scales">
                {SCALE_NOTES.map((t) => cap.meta.notes.find((n) => n.title === t)).filter(Boolean).map((n) => <div key={n!.title}><dt>{n!.title}</dt><dd>{n!.text.replace(" # numbers point to the Capabilities tab.", "")}</dd></div>)}
              </dl>
            </>
          )}
        </section>

        <section id="credits">
          <h2>Credits and data</h2>
          <div className="prose">
            <p>{AUTHORS.map((a, i) => <span key={a.name}>{i ? " and " : ""}<a href={a.url} target="_blank" rel="noopener">{a.name}</a></span>)}, High-Tech Geopolitics Programme, <a href="https://takshashila.org.in" target="_blank" rel="noopener">Takshashila Institution</a>.</p>
            <p>Related work: <a href="https://insidethemotor.takshashila.org.in/" target="_blank" rel="noopener">Inside the Motor</a>, on rare-earth-free EV motors, and Pranay Kotasthane's <a href="https://fabs.pranaykotas.com" target="_blank" rel="noopener">India Semiconductor Tracker</a>.</p>
            <p>Project records by layer (CSV): {LAYERS.map((l, i) => <span key={l.id}>{i ? " · " : ""}<a href={`${data}${l.id}.csv`} download>{l.label}</a></span>)}. All records with coordinates: <a href={`${data}all-entities.geojson`} download>GeoJSON</a>. Data under CC BY 4.0.</p>
            <p>Scores updated October 2026; project records {fmtDate(core.meta.sources.map.date)}; capability research {fmtDate(core.meta.capabilityUpdated)}, technology guides {fmtDate(core.meta.capabilityResearch)}.</p>
            <p className="muted">{BOUNDARY_NOTE}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
