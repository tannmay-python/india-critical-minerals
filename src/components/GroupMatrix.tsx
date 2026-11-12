// Average profile by group: each group's mean on fourteen scores. As on the dashboard, the highest
// value in a row is shaded in that group's colour.
import type { CSSProperties } from "react";
import { useCore } from "../data/store";
import { groupColor, inkOn } from "../lib/colors";
import { href } from "../lib/router";
import "./GroupMatrix.css";

export function GroupMatrix() {
  const core = useCore();
  const { groups, rows } = core.matrix;
  return (
    <div className="gm-scroll">
      <table className="gm">
        <thead>
          <tr>
            <th />
            {groups.map((g) => (
              <th key={g.id} scope="col"><a href={href(`/groups/${g.id}`)}><i className="swatch" style={{ "--c": groupColor(g.id) } as CSSProperties} /><span><b className="num">Group {g.id}</b> {g.name}</span></a></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}<small className="num"> /{r.max}</small></th>
              {r.cells.map((c) => {
                const fill = c.max ? groupColor(c.g) : undefined;
                return <td key={c.g} className={`num${c.max ? " lead" : ""}`} style={fill ? { background: fill, color: inkOn(fill) } : undefined}>{c.v.toFixed(2)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
