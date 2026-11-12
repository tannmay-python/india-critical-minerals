// What could come first: every mineral with a capability pathway, placed by how hard the next capability is
// for India and how long it takes to reach meaningful output. Top left is the place to start.
import type { CSSProperties } from "react";
import { useCore } from "../data/store";
import type { Capability } from "../data/types";
import { groupColor, inkOn } from "../lib/colors";
import { fmtRange } from "../lib/format";
import { mineralHref } from "../lib/router";
import { useTip } from "./Tip";
import "./Horizons.css";

const TIMES = ["0-3 yrs", "3-7 yrs", "7+ yrs"];
const EASES = ["Easy", "Moderate", "Hard"];

export function Horizons({ cap }: { cap: Capability }) {
  const core = useCore();
  const tip = useTip();
  const meaning = Object.fromEntries((cap.meta.scales.ease ?? "").split(". ").map((s) => { const [k, ...rest] = s.split(": "); return [k.trim(), rest.join(": ").replace(/\.$/, "")]; }));
  const groups = [...new Set(cap.minerals.map((m) => m.group))].sort((a, b) => a - b);
  return (
    <div className="horizons">
      <table>
        <thead>
          <tr><td />{TIMES.map((t) => <th key={t} scope="col">{fmtRange(t).replace("yrs", "years")}</th>)}</tr>
        </thead>
        <tbody>
          {EASES.map((e) => (
            <tr key={e}>
              <th scope="row">{e}<small>{meaning[e]}</small></th>
              {TIMES.map((t) => (
                <td key={t}>
                  <div className="hz-cell">
                    {cap.minerals.filter((m) => m.ease === e && m.time_to_output === t).sort((a, b) => a.group - b.group || a.name.localeCompare(b.name)).map((m) => {
                      const c = groupColor(m.group);
                      const card = <><strong>{m.name}</strong><span>{m.value_chain_step}</span><span className="tip-note">{m.next_move}</span></>;
                      return (
                        <a key={m.id} href={mineralHref(m.name)} style={{ background: c, color: inkOn(c) }} aria-label={`${m.name}: ${m.next_move}`}
                          onPointerEnter={(ev) => tip.show(card, ev.currentTarget)} onPointerLeave={tip.hide} onFocus={(ev) => tip.show(card, ev.currentTarget)} onBlur={tip.hide} onClick={tip.hide}>{m.symbol}</a>
                      );
                    })}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="legend">
        {groups.map((g) => <li key={g}><i className="swatch" style={{ "--c": groupColor(g) } as CSSProperties} />{core.group.get(g)?.name}</li>)}
      </ul>
    </div>
  );
}
