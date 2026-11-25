import { useCore, useData } from "../data/store";
import type { Capability } from "../data/types";
import { ChemistryCards, StrategyCards } from "../components/CapabilityCards";
import { CapabilityNetwork } from "../components/CapabilityNetwork";
import { Horizons } from "../components/Horizons";
import { fmtDate } from "../lib/format";
import { href } from "../lib/router";
import "./CapabilityPages.css";

export function CapabilitiesPage() {
  const core = useCore();
  const cap = useData<Capability>("capability.json");
  if (!cap) return <main className="wrap cap" />;
  return (
    <main className="wrap cap">
      <h1>Where India can build capability</h1>
      <p className="cap-lede">Pathways are drawn for all {cap.minerals.length} minerals.</p>

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
        <StrategyCards cap={cap} />
      </section>

      <section className="cap-section">
        <h2>Chemistry India already has</h2>
        <ChemistryCards cap={cap} />
      </section>
      <p className="cap-foot muted">Capability research updated {fmtDate(core.meta.capabilityUpdated)}; technology guides checked {fmtDate(core.meta.capabilityResearch)}. <a href={href("/method")}>Method and sources</a></p>
    </main>
  );
}
