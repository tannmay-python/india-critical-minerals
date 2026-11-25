// One mineral's projects (the project map's records) by stage of the value chain. Each stage is
// headed by a bar in its colour on the route line; a stage with no project keeps a pale bar, so the
// gaps show. Recycle and Research appear only when a project sits in them. Each project carries the
// map's mark: colour is the stage, a solid mark is operating or licensed, a ring is in progress.
import { useState, type CSSProperties } from "react";
import type { Project } from "../data/types";
import { BAND_COLOR } from "../lib/colors";
import { href } from "../lib/router";
import { Mark } from "./ProjectMark";
import "./StageProjects.css";

const STAGES: { id: string; label: string; band: Project["band"]; aux?: boolean }[] = [
  { id: "mine", label: "Mine", band: "upstream" },
  { id: "refine", label: "Refine", band: "process" },
  { id: "make", label: "Make", band: "make" },
  { id: "use", label: "Use", band: "demand" },
  { id: "recycle", label: "Recycle", band: "recycle", aux: true },
  { id: "research", label: "Research", band: "research", aux: true },
];
const RANK = { active: 0, pipeline: 1, inactive: 2 } as const;
const SHOWN = 4;

export function StageProjects({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const stages = STAGES.filter((s) => !s.aux || projects.some((p) => p.band === s.band));
  return (
    <div className="sp" style={{ "--cols": stages.length } as CSSProperties}>
      {stages.map((s) => {
        const list = projects.filter((p) => p.band === s.band)
          .sort((a, b) => RANK[a.group] - RANK[b.group] || Number(a.kind === "block") - Number(b.kind === "block") || a.name.localeCompare(b.name));
        const all = open.has(s.id);
        return (
          <div key={s.id} className={`sp-stage${list.length ? "" : " empty"}`} style={{ "--band": BAND_COLOR[s.band] } as CSSProperties}>
            <h3>{s.label}{list.length > 0 && <span className="num">{list.length}</span>}</h3>
            {list.length > 0 && (
              <ul>
                {(all ? list : list.slice(0, SHOWN)).map((p) => (
                  <li key={p.id}>
                    <Mark kind={p.kind} band={p.band} group={p.group} size={12} />
                    <span>
                      <a href={href(`/project/${p.id}`)}>{p.name}</a>
                      <small>{p.status}{p.abroad && p.country ? ` · ${p.country}` : p.state ? ` · ${p.state}` : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {list.length > SHOWN && (
              <button type="button" className="sp-more" aria-expanded={all}
                onClick={() => setOpen((o) => { const n = new Set(o); if (all) n.delete(s.id); else n.add(s.id); return n; })}>
                {all ? "Fewer" : `${list.length - SHOWN} more`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
