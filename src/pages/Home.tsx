import { useEffect, type CSSProperties } from "react";
import { useCore } from "../data/store";
import { LENSES, PeriodicTable, type Lens } from "../components/PeriodicTable";
import { ListsChart } from "../components/ListsChart";
import { AUTHORS, HEADLINE, INTRO, LISTS_CHART } from "../content/home";
import { replaceQuery, useRoute } from "../lib/router";
import { BAND_COLOR, SEQ5 } from "../lib/colors";
import "./Home.css";

export function Home() {
  const core = useCore();
  const { params } = useRoute();
  const lens = (LENSES.find((l) => l.id === params.get("lens"))?.id ?? "india") as Lens;
  const last = core.ptSteps.length - 1;
  const step = clamp(Number(params.get("step") ?? 0), 0, last);
  const score = clamp(Number(params.get("score") ?? 3), 0, core.subscores.length - 1); // refining concentration

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

  const sub = core.subscores[score];
  const vec = core.vector.get(sub.vector)!;
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
          {lens === "score" && (
            <label className="score-pick">
              <span className="sr-only">Score shown</span>
              <select value={score} onChange={(e) => set({ score: e.target.value })}>
                {[...new Set(core.subscores.map((s) => s.family))].map((fam) => (
                  <optgroup key={fam} label={fam}>
                    {core.subscores.filter((s) => s.family === fam).map((s) => <option key={s.i} value={s.i}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
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
          {lens === "lists" && <Scale title="National lists that name the element, of five (US, EU, China, Russia, India)" stops={[1, 2, 3, 4, 5]} colors={SEQ5} />}
          {lens === "score" && (
            <Scale title={sub.bands ? vec.what : sub.note ?? vec.what}
              stops={sub.max === 5 ? [1, 2, 3, 4, 5] : [0, sub.max]} colors={sub.max === 5 ? SEQ5 : [SEQ5[0], SEQ5[4]]}
              low={sub.bands?.[0].label} high={sub.bands?.[sub.bands.length - 1].label} />
          )}
          {lens === "projects" && (
            <ul className="legend">
              {core.bands.map((b) => <li key={b.id}><i className="swatch sq" style={{ "--c": BAND_COLOR[b.id] } as CSSProperties} />{b.label}</li>)}
            </ul>
          )}
          {lens === "capability" && <Scale title="Time to meaningful output on the capability pathway" stops={["0–3 yrs", "3–7 yrs", "7+ yrs"]} colors={[SEQ5[4], SEQ5[2], SEQ5[1]]} />}
          {lens === "groups" && <span className="sr-only">{core.groups.map((g) => g.name).join(", ")}</span>}
        </div>

        <PeriodicTable lens={lens} step={step} score={score} />

      </section>
    </main>
  );
}

function Scale({ title, stops, colors, low, high }: { title: string; stops: (string | number)[]; colors: string[]; low?: string; high?: string }) {
  return (
    <div className="scale">
      <p>{title}</p>
      <div className="scale-row">
        {low && <span className="scale-end">{low}</span>}
        <ol>
          {stops.map((s, i) => <li key={String(s)}><i style={{ background: colors[i] }} /><span className="num">{s}</span></li>)}
        </ol>
        {high && <span className="scale-end">{high}</span>}
      </div>
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : lo);
