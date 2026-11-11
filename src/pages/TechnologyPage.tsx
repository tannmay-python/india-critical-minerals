// A technology guide: one kind of chemistry India already runs, how it works, who does it, which
// minerals it carries over to, and a proposed way to extend it. Every block cites its sources.
import { useData } from "../data/store";
import type { Capability, GuideBlock } from "../data/types";
import { href, mineralHref } from "../lib/router";
import { Refs, SourcesList, useCitations } from "../components/Citations";
import "./CapabilityPages.css";

type Block = GuideBlock & { text?: string; title?: string; name?: string; description?: string; how?: string; fit?: string; minerals?: string[]; location?: string; role?: string; status?: string; evidence_date?: string };

export function TechnologyPage({ slug }: { slug: string }) {
  const cap = useData<Capability>("capability.json");
  const k = cap?.chemistry.find((x) => x.slug === slug);
  const g = k?.guide;
  const cite = useCitations(cap, [...(g?.source_ids ?? []), ...(k?.sources ?? [])]);
  if (!cap) return <main className="wrap cap" />;
  if (!k || !g) return <main className="wrap cap"><h1>No such technology</h1><p><a href={href("/capabilities")}>All capabilities</a></p></main>;
  const mineral = (id: string) => cap.minerals.find((m) => m.id === id);
  const related = (g.related_strategies ?? []).map((id) => cap.strategies.find((s) => s.id === id)).filter(Boolean);
  const blocks = (key: string) => (g[key] as Block[] | undefined) ?? [];
  const glossary = (g.glossary as { term: string; meaning: string }[] | undefined) ?? [];
  const i = cap.chemistry.findIndex((x) => x.id === k.id);
  const prev = cap.chemistry[i - 1], next = cap.chemistry[i + 1];

  return (
    <main className="wrap cap cap-one tech">
      <p className="crumb"><a href={href("/capabilities")}>Capabilities</a></p>
      <h1>{k.name}</h1>
      {g.summary && <p className="cap-lede">{g.summary}</p>}

      <dl className="cap-facts">
        <div><dt>Who has it</dt><dd>{k.who}</dd></div>
        <div><dt>Carries over to</dt><dd>{k.carries_over_to}</dd></div>
        <div><dt>Fit</dt><dd>{k.fit}</dd></div>
      </dl>

      <section className="cap-section">
        <h2>How it works</h2>
        <div className="prose">{blocks("what").map((b, n) => <p key={n}>{b.text}<Refs ids={b.refs} cite={cite} /></p>)}</div>
        <ol className="steps-row">
          {blocks("value_chain").map((b, n) => (
            <li key={n}><h3>{b.name}</h3><p>{b.description}<Refs ids={b.refs} cite={cite} /></p></li>
          ))}
        </ol>
        {typeof g.value_chain_note === "string" && g.value_chain_note && <p className="muted cap-note">{g.value_chain_note}</p>}
      </section>

      <section className="cap-section">
        <h2>Who does it</h2>
        <div className="actors">
          {blocks("actors").map((a, n) => (
            <article key={n}>
              <h3>{a.name}</h3>
              <p className="muted">{a.location}</p>
              <p>{a.role}<Refs ids={a.refs} cite={cite} /></p>
              <p className="actor-status">{a.status}</p>
              <p className="muted actor-date">{a.evidence_date}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cap-section">
        <h2>Minerals it carries over to</h2>
        <ul className="mineral-links">
          {blocks("mineral_links").map((l, n) => (
            <li key={n}>
              <p className="ml-names">{(l.minerals ?? []).map((id) => mineral(id)).filter(Boolean).map((m) => <a className="chip" key={m!.id} href={mineralHref(m!.name)}><b>{m!.symbol}</b> {m!.name}</a>)}</p>
              <div><p>{l.how}<Refs ids={l.refs} cite={cite} /></p><p className="muted">{l.fit}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="cap-section">
        <h2>Proposed pathway</h2>
        <div className="blocks">{blocks("expansion").map((b, n) => <article key={n}><h3>{b.title}</h3><p>{b.text}<Refs ids={b.refs} cite={cite} /></p></article>)}</div>
      </section>

      <section className="cap-section">
        <h2>Constraints</h2>
        <div className="blocks">{blocks("constraints").map((b, n) => <article key={n}><h3>{b.title}</h3><p>{b.text}<Refs ids={b.refs} cite={cite} /></p></article>)}</div>
      </section>

      {related.length > 0 && (
        <section className="cap-section">
          <h2>Capabilities it feeds</h2>
          <ul className="cap-links">{related.map((s) => <li key={s!.id}><a href={href(`/capability/${s!.slug}`)}>{s!.name}</a><p>{s!.what}</p></li>)}</ul>
        </section>
      )}

      {glossary.length > 0 && (
        <section className="cap-section">
          <h2>Terms</h2>
          <dl className="glossary">{glossary.map((t) => <div key={t.term}><dt>{t.term}</dt><dd>{t.meaning}</dd></div>)}</dl>
        </section>
      )}

      <section className="cap-section">
        <h2>Sources</h2>
        <SourcesList cite={cite} />
      </section>

      <nav className="cap-pager" aria-label="Technologies">
        {prev ? <a href={href(`/technology/${prev.slug}`)}><small>Previous</small>{prev.name}</a> : <span />}
        {next ? <a className="next" href={href(`/technology/${next.slug}`)}><small>Next</small>{next.name}</a> : <span />}
      </nav>
    </main>
  );
}
