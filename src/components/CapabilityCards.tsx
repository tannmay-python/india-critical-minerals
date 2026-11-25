// The capabilities to build and the chemistry India already has, as cards. Each capability shows its
// complexity and the minerals it serves, in the group colours of the board above; the whole card
// opens the capability, and the mineral tiles open the minerals.
import type { Capability } from "../data/types";
import { groupColor, inkOn } from "../lib/colors";
import { href, mineralHref } from "../lib/router";
import "./CapabilityCards.css";

const GROUP_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Five segments: solid up to the low end of the complexity range ("4-5"), lighter to its high end. */
function Meter({ complexity }: { complexity: string }) {
  const lo = Number(/\d/.exec(complexity)?.[0] ?? 0), hi = Math.max(lo, Number(/(\d)\D*$/.exec(complexity)?.[1] ?? lo));
  return <span className="cc-meter" title={`Complexity ${complexity.replace("-", "–")} of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= lo ? "on" : n <= hi ? "half" : ""} />)}</span>;
}

function Tiles({ cap, ids, small }: { cap: Capability; ids: string[]; small?: boolean }) {
  const byId = new Map(cap.minerals.map((m) => [m.id, m]));
  const list = ids.map((id) => byId.get(id)).filter((m) => m !== undefined).sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  return (
    <span className="cc-tiles">
      {list.map((m) => {
        const c = groupColor(m.group);
        return <a key={m.id} className={small ? "cc-tile small" : "cc-tile"} href={mineralHref(m.name)} title={m.name} style={{ background: c, color: inkOn(c) }}>{m.symbol}</a>;
      })}
    </span>
  );
}

export function StrategyCards({ cap }: { cap: Capability }) {
  const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
  return (
    <div className="cc-grid">
      {strategies.map((s) => (
        <div className="cc-card" key={s.id}>
          <span className="cc-top"><span className="cc-n num">{s.number}</span><Meter complexity={s.complexity} /></span>
          <a className="cc-name" href={href(`/capability/${s.slug}`)}>{s.name}</a>
          <span className="cc-what">{s.what}</span>
          <Tiles cap={cap} ids={s.minerals} />
        </div>
      ))}
    </div>
  );
}

export function ChemistryCards({ cap }: { cap: Capability }) {
  return (
    <div className="cc-grid small">
      {cap.chemistry.map((k) => (
        <div className="cc-card small" key={k.id}>
          <a className="cc-name" href={href(`/technology/${k.slug}`)}>{k.name}</a>
          <span className="cc-what">{k.who}</span>
          <Tiles cap={cap} ids={k.minerals} small />
        </div>
      ))}
    </div>
  );
}
