// One mineral's value chain, with everything the three datasets know placed on it: how concentrated
// world supply is at mining and at refining (the dashboard's scores), who does what at each stage
// (the capability map), and each of India's projects as a mark at its stage (the project map).
import type { CSSProperties } from "react";
import { useCore } from "../data/store";
import type { ChainStage, Mineral, Project } from "../data/types";
import { href } from "../lib/router";
import { KIND_LABEL, Mark, STATUS_LABEL, STATUS_LABEL_ABROAD } from "./ProjectMark";
import { useTip } from "./Tip";
import "./Chain.css";

const COLUMNS: { id: string; label: string; band: Project["band"]; aux?: boolean }[] = [
  { id: "mine", label: "Mine", band: "upstream" },
  { id: "refine", label: "Refine", band: "process" },
  { id: "make", label: "Make", band: "make" },
  { id: "use", label: "Use", band: "demand" },
  { id: "recycle", label: "Recycle", band: "recycle", aux: true },
  { id: "research", label: "Research", band: "research", aux: true },
];
const RANK = { active: 0, pipeline: 1, inactive: 2 } as const;

export function Chain({ mineral, stages, projects }: { mineral: Mineral; stages: ChainStage[] | null; projects: Project[] }) {
  const core = useCore();
  const tip = useTip();
  const bands = core.vector.get("supplier_concentration")?.bands ?? [];
  const concentration: Record<string, number> = { mine: mineral.s[2], refine: mineral.s[3] };
  const stage = (id: string) => stages?.find((s) => s.stage === id);
  const inColumn = (band: Project["band"]) => projects.filter((p) => p.band === band)
    .sort((a, b) => RANK[a.group] - RANK[b.group] || Number(a.kind === "block") - Number(b.kind === "block") || a.name.localeCompare(b.name));
  const kinds = [...new Set(projects.map((p) => p.kind))];
  const groups = (["active", "pipeline", "inactive"] as const).filter((g) => projects.some((p) => p.group === g));

  return (
    <div className={`chain${stages ? " with-text" : ""}`}>
      <div className="chain-grid" style={{ "--cols": COLUMNS.length } as CSSProperties}>
        <div className="chain-corner" />
        {COLUMNS.map((c, i) => (
          <div key={c.id} className={`chain-head${c.aux ? " aux" : ""}${i === 4 ? " aux-first" : ""}`}>
            <span className="chain-stage">{c.label}</span>
            {concentration[c.id] !== undefined && (
              <span className="chain-conc" title={`${c.id === "mine" ? "Mining" : "Refining"} concentration ${concentration[c.id]} of 5`}>
                <span className="pips" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= concentration[c.id] ? "on" : ""} />)}</span>
                {bands[concentration[c.id] - 1]?.label}
              </span>
            )}
          </div>
        ))}

        {stages && (["world", "india"] as const).map((who) => (
          <div className="chain-row" key={who}>
            <div className="chain-label">{who === "world" ? "World" : "India"}</div>
            {COLUMNS.map((c, i) => (
              <div key={c.id} className={`chain-cell ${who}${c.aux ? " aux" : ""}${i === 4 ? " aux-first" : ""}`}>{stage(c.id)?.[who] ?? ""}</div>
            ))}
          </div>
        ))}

        <div className="chain-row">
          <div className="chain-label">{stages ? "Projects" : ""}</div>
          {COLUMNS.map((c, i) => {
            const list = inColumn(c.band);
            return (
              <div key={c.id} className={`chain-cell marks${c.aux ? " aux" : ""}${i === 4 ? " aux-first" : ""}`}>
                {list.map((p) => (
                  <a key={p.id} href={href(`/project/${p.id}`)} aria-label={`${p.name}: ${p.status}`}
                    onPointerEnter={(ev) => tip.show(<><strong>{p.name}</strong><span>{p.stage} · {p.status}</span><span>{[p.state, p.abroad ? p.country : null].filter(Boolean).join(", ")}</span></>, ev.currentTarget)}
                    onPointerLeave={tip.hide} onFocus={(ev) => tip.show(<><strong>{p.name}</strong><span>{p.stage} · {p.status}</span></>, ev.currentTarget)} onBlur={tip.hide}>
                    <Mark kind={p.kind} band={p.band} group={p.group} size={13} />
                  </a>
                ))}
                {list.length > 0 && <span className="chain-count num">{list.length}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {projects.length > 0 && (
        <ul className="chain-key">
          {groups.map((g) => <li key={g}><Mark kind="site" band="demand" group={g} size={11} />{(projects.every((p) => p.abroad) ? STATUS_LABEL_ABROAD : STATUS_LABEL)[g]}</li>)}
          {kinds.length > 1 && kinds.map((k) => <li key={k}><Mark kind={k} band="demand" group="active" size={11} />{KIND_LABEL[k]}</li>)}
        </ul>
      )}
    </div>
  );
}
