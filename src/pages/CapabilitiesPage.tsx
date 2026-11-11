import { useCore, useData } from "../data/store";
import type { Capability } from "../data/types";
import { CapabilityNetwork } from "../components/CapabilityNetwork";
import { fmtDate } from "../lib/format";
import { href, mineralHref } from "../lib/router";
import "./CapabilityPages.css";

export function CapabilitiesPage() {
  const core = useCore();
  const cap = useData<Capability>("capability.json");
  if (!cap) return <main className="wrap cap" />;
  const mineral = new Map(cap.minerals.map((m) => [m.id, m]));
  const strategies = [...cap.strategies].sort((a, b) => a.number - b.number);
  return (
    <main className="wrap cap">
      <h1>Where India can build capability</h1>

      <CapabilityNetwork cap={cap} />

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
              <p className="cap-minerals">{s.minerals.map((id) => mineral.get(id)).filter(Boolean).map((m) => <a className="sym" key={m!.id} href={mineralHref(m!.name)} title={m!.name}>{m!.symbol}</a>)}</p>
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
              <p className="cap-minerals">{k.minerals.map((id) => mineral.get(id)).filter(Boolean).map((m) => <a className="sym" key={m!.id} href={mineralHref(m!.name)} title={m!.name}>{m!.symbol}</a>)}</p>
            </li>
          ))}
        </ol>
      </section>
      <p className="cap-foot muted">Capability research updated {fmtDate(core.meta.capabilityUpdated)}; technology guides checked {fmtDate(core.meta.capabilityResearch)}. <a href={href("/method")}>Method and sources</a></p>
    </main>
  );
}
