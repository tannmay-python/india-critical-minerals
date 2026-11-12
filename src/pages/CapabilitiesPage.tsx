import { useCore, useData } from "../data/store";
import type { Capability } from "../data/types";
import { CapabilityNetwork } from "../components/CapabilityNetwork";
import { Horizons } from "../components/Horizons";
import { fmtDate } from "../lib/format";
import { href, mineralHref } from "../lib/router";
import "./CapabilityPages.css";

export function CapabilitiesPage() {
  const core = useCore();
  const cap = useData<Capability>("capability.json");
  if (!cap) return <main className="wrap cap" />;
  const mineral = new Map(cap.minerals.map((m) => [m.id, m]));
  const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
  const groupNames = cap.groups.map((g) => core.group.get(g.id)?.name ?? g.name);
  const pips = (complexity: string) => {
    const lo = Number(/\d/.exec(complexity)?.[0] ?? 0), hi = Number(/(\d)\D*$/.exec(complexity)?.[1] ?? lo);
    return <span className="pips" title={`Complexity ${complexity.replace("-", "–")} of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= lo ? "on" : n <= hi ? "half" : ""} />)}</span>;
  };
  return (
    <main className="wrap cap">
      <h1>Where India can build capability</h1>
      <p className="cap-lede">Pathways are drawn for the {cap.minerals.length} minerals in three groups: {groupNames.slice(0, -1).join(", ")} and {groupNames[groupNames.length - 1]}.</p>

      <section className="cap-section">
        <h2>What could come first</h2>
        <Horizons cap={cap} />
      </section>

      <section className="cap-section cap-network">
        <h2>What carries over</h2>
        <CapabilityNetwork cap={cap} />
      </section>

      <section className="cap-section">
        <h2>Capabilities to build</h2>
        <ol className="cap-list">
          {strategies.map((s) => (
            <li key={s.id}>
              <span className="cap-n num">{s.number}</span>
              <div>
                <a className="cap-name" href={href(`/capability/${s.slug}`)}>{s.name}</a>
                <p>{s.what}</p>
              </div>
              <div className="cap-side">
                {pips(s.complexity)}
                <p className="cap-minerals">{s.minerals.map((id) => mineral.get(id)).filter(Boolean).map((m) => <a className="sym" key={m!.id} href={mineralHref(m!.name)} title={m!.name}>{m!.symbol}</a>)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="cap-section">
        <h2>Chemistry India already has</h2>
        <ol className="cap-list">
          {cap.chemistry.map((k) => (
            <li key={k.id}>
              <span className="cap-n" />
              <div>
                <a className="cap-name" href={href(`/technology/${k.slug}`)}>{k.name}</a>
                <p>{k.who}</p>
              </div>
              <div className="cap-side">
                <p className="cap-minerals">{k.minerals.map((id) => mineral.get(id)).filter(Boolean).map((m) => <a className="sym" key={m!.id} href={mineralHref(m!.name)} title={m!.name}>{m!.symbol}</a>)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <p className="cap-foot muted">Capability research updated {fmtDate(core.meta.capabilityUpdated)}; technology guides checked {fmtDate(core.meta.capabilityResearch)}. <a href={href("/method")}>Method and sources</a></p>
    </main>
  );
}
