// One capability India could build: what it is, which minerals it serves, who outside China has
// done it and at what cost, what India starts from, and what is missing.
import { useData } from "../data/store";
import type { Capability } from "../data/types";
import { href, mineralHref } from "../lib/router";
import { SourcesList, useCitations } from "../components/Citations";
import "./CapabilityPages.css";

export function CapabilityPage({ slug }: { slug: string }) {
  const cap = useData<Capability>("capability.json");
  const s = cap?.strategies.find((x) => x.slug === slug);
  const cite = useCitations(cap, s?.sources ?? []);
  if (!cap) return <main className="wrap cap" />;
  if (!s) return <main className="wrap cap"><h1>No such capability</h1><p><a href={href("/capabilities")}>All capabilities</a></p></main>;
  const minerals = s.minerals.map((id) => cap.minerals.find((m) => m.id === id)).filter(Boolean);
  const chemistry = cap.chemistry.filter((k) => k.guide?.related_strategies?.includes(s.id));
  const ordered = [...cap.strategies].sort((a, b) => a.number - b.number);
  const i = ordered.findIndex((x) => x.id === s.id);
  const prev = ordered[i - 1], next = ordered[i + 1];
  const level = Number(/\d/.exec(s.complexity)?.[0] ?? 0), top = Number(/(\d)\D*$/.exec(s.complexity)?.[1] ?? level);
  return (
    <main className="wrap cap cap-one">
      <p className="crumb"><a href={href("/capabilities")}>Capabilities</a></p>
      <h1>{s.name}</h1>
      <p className="cap-lede">{s.what}</p>

      <p className="cap-serves">
        {minerals.map((m) => <a className="chip" key={m!.id} href={mineralHref(m!.name)}><b>{m!.symbol}</b> {m!.name}</a>)}
      </p>

      <dl className="cap-facts">
        <div><dt>Outside China</dt><dd>{s.outside_china}</dd></div>
        <div><dt>Indicative cost</dt><dd>{s.cost}</dd></div>
        <div><dt>India's base</dt><dd>{s.india_base}</dd></div>
        <div><dt>Gap</dt><dd>{s.gap}</dd></div>
        <div><dt>Complexity</dt><dd><span className="pips" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= level ? "on" : n <= top ? "half" : ""} />)}</span> {s.complexity.replace("-", "–")} of 5</dd></div>
      </dl>

      {chemistry.length > 0 && (
        <section className="cap-section">
          <h2>Chemistry that carries over</h2>
          <ul className="cap-links">
            {chemistry.map((k) => <li key={k.id}><a href={href(`/technology/${k.slug}`)}>{k.name}</a><p>{k.who}</p></li>)}
          </ul>
        </section>
      )}

      <section className="cap-section">
        <h2>Sources</h2>
        <SourcesList cite={cite} />
      </section>

      <nav className="cap-pager" aria-label="Capabilities">
        {prev ? <a href={href(`/capability/${prev.slug}`)}><small>Previous</small>{prev.name}</a> : <span />}
        {next ? <a className="next" href={href(`/capability/${next.slug}`)}><small>Next</small>{next.name}</a> : <span />}
      </nav>
    </main>
  );
}
