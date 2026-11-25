import { useEffect, type CSSProperties } from "react";
import { useCore } from "../data/store";
import { LENSES, PeriodicTable } from "../components/PeriodicTable";
import { ListsChart } from "../components/ListsChart";
import { AUTHORS, HEADLINE, INTRO, LISTS_CHART } from "../content/home";
import { replaceQuery, useRoute } from "../lib/router";
import { BAND_COLOR, SEQ5 } from "../lib/colors";
import "./Home.css";

export function Home() {
  const core = useCore();
  const { params } = useRoute();
  const lens = LENSES.find((l) => l.id === params.get("lens"))?.id ?? "india";
  const last = core.ptSteps.length - 1;
  const step = clamp(Number(params.get("step") ?? 0), 0, last);

  const set = (patch: Record<string, string | number | null>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v === null ? q.delete(k) : q.set(k, String(v));
    if (q.get("lens") === "india") q.delete("lens");
    if (q.get("step") === "0") q.delete("step");
    replaceQuery(q);
  };

  // arrow keys step through the reduction while the India lens is showing
  useEffect(() => {
    if (lens !== "india") return;
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest("input, select, textarea")) return;
      if (ev.key === "ArrowRight" && step < last) set({ step: step + 1 });
      if (ev.key === "ArrowLeft" && step > 0) set({ step: step - 1 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = core.ptSteps[step];

  return (
    <main className="home">
      <section className="wrap hero">
        <h1>{HEADLINE}</h1>
        <p className="byline">
          {AUTHORS.map((a, i) => <span key={a.name}>{i ? " and " : ""}<a href={a.url} target="_blank" rel="noopener">{a.name}</a></span>)}
        </p>
      </section>
      <section className="wrap hero-rest">
        <div className="hero-body">
          <div className="prose">{INTRO.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}</div>
          <figure className="hero-chart">
            <figcaption><strong>{LISTS_CHART.title}</strong><span>{LISTS_CHART.sub}</span></figcaption>
            <ListsChart series={core.listsSeries} />
          </figure>
        </div>
      </section>

      <section className="wrap table-section" id="table">
        <div className="lens-bar">
          <div className="pills" role="group" aria-label="What the table shows">
            {LENSES.map((l) => (
              <button key={l.id} type="button" className="pill" aria-pressed={l.id === lens} onClick={() => set({ lens: l.id })}>{l.label}</button>
            ))}
          </div>
        </div>

        <div className="lens-note">
          {lens === "india" && (
            <>
              <div className="steps">
                <button type="button" className="step-arrow" aria-label="Previous step" disabled={step === 0} onClick={() => set({ step: step - 1 })}>‹</button>
                {core.ptSteps.map((s, i) => (
                  <button key={s.pill} type="button" className="step" aria-pressed={i === step} onClick={() => set({ step: i })}>{s.pill}</button>
                ))}
                <button type="button" className="step-arrow" aria-label="Next step" disabled={step === last} onClick={() => set({ step: step + 1 })}>›</button>
              </div>
              <p className="caption"><b className="figure">{current.num}</b> {current.caption}</p>
            </>
          )}
          {lens === "lists" && (
            <div className="scale">
              <p>National lists that name the element, of five (US, EU, China, Russia, India)</p>
              <ol>
                {SEQ5.map((color, i) => <li key={color}><i style={{ background: color }} /><span className="num">{i + 1}</span></li>)}
              </ol>
            </div>
          )}
          {lens === "projects" && (
            <ul className="legend">
              {core.bands.map((b) => <li key={b.id}><i className="swatch sq" style={{ "--c": BAND_COLOR[b.id] } as CSSProperties} />{b.label}</li>)}
            </ul>
          )}
          {lens === "groups" && <span className="sr-only">{core.groups.map((g) => g.name).join(", ")}</span>}
        </div>

        <PeriodicTable lens={lens} step={step} />

      </section>
    </main>
  );
}

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : lo);
