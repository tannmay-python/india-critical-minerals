// A mineral's journey drawn as a route line: one stop per stage, from the deposit to the finished
// product. The line carries only the stage names and takes each stage's colour; a dashed arc shows
// scrap going back in. Everything else (the material, what joins, what leaves) is in the card that
// opens for the chosen stop, so that no label appears under some stops and not others.
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Journey as JourneyData, JourneyStep } from "../journeys";
import { BAND_COLOR } from "../lib/colors";
import { mineralHref } from "../lib/router";
import "./Journey.css";

export function Journey({ journey, color }: { journey: JourneyData; color: string }) {
  const core = useCore();
  const [chosen, setChosen] = useState(0);
  useEffect(() => setChosen(0), [journey.mineral]);
  const steps = journey.steps;
  const at = Math.min(chosen, steps.length - 1);
  const step = steps[at];

  /** Minerals on this site that are named in a line become links to their pages. */
  const linked = (text: string): ReactNode => {
    const names = core.minerals.map((m) => m.name).filter((n) => n !== journey.mineral);
    const parts = text.split(new RegExp(`\\b(${names.join("|")})\\b(?!-)`, "i"));
    const seen = new Set<string>();
    return parts.map((part, i) => {
      const hit = i % 2 === 1 ? names.find((n) => n.toLowerCase() === part.toLowerCase()) : undefined;
      // each mineral is linked once, where it is first named
      if (!hit || seen.has(hit)) return <Fragment key={i}>{part}</Fragment>;
      seen.add(hit);
      return <a key={i} href={mineralHref(hit)}>{part}</a>;
    });
  };

  // scrap comes back in where processing starts
  const back = steps.findIndex((s) => s.band === "recycle");
  const reentry = steps.findIndex((s) => s.band === "process" || s.band === "make");
  const loop = back > 0 && reentry >= 0 && reentry < back ? { from: reentry, to: back } : null;
  const prev = steps[at - 1], next = steps[at + 1];

  return (
    <div className="journey" style={{ "--el": color, "--n": steps.length } as CSSProperties}>
      <div className="jr-map">
        {loop && <i className="jr-loop" aria-hidden="true" style={{ "--a": loop.from, "--b": loop.to } as CSSProperties} />}
        {steps.map((s, i) => (
          <button type="button" key={s.id} className="jr-stop" aria-current={i === at ? "step" : undefined} aria-controls="journey-stage" onClick={() => setChosen(i)}
            style={{ "--band": BAND_COLOR[s.band], "--next": BAND_COLOR[(steps[i + 1] ?? s).band], order: i * 2 } as CSSProperties}>
            <span className="jr-name">{s.title}</span>
            <i className="jr-dot" aria-hidden="true" />
          </button>
        ))}
        <section id="journey-stage" className="jr-stage" aria-live="polite" style={{ "--band": BAND_COLOR[step.band], order: at * 2 + 1 } as CSSProperties}>
          <div className="jr-body">
            <h3>{step.title}</h3>
            <p className="jr-text">{linked(step.text)}</p>
            {step.chem && <p className="jr-chem">{step.chem}</p>}
            {step.alt && <p className="jr-alt">{step.alt}</p>}
            {step.out?.map((o) => <p className="jr-out" key={o}>{linked(o)}</p>)}
            {step.india && <p className="jr-india"><b>India</b>{step.india}</p>}
          </div>
          <div className="jr-side">
            {step.form && <p className="jr-form"><Waffle value={step.form.content} label={`${step.form.name}: ${step.form.label}`} /><span><b>{step.form.name}</b>{step.form.label}</span></p>}
            {step.shares && <Shares step={step} />}
          </div>
          <p className="jr-nav">
            {prev ? <button type="button" className="prev" onClick={() => setChosen(at - 1)}>{prev.title}</button> : <span />}
            {next && <button type="button" className="next" onClick={() => setChosen(at + 1)}>{next.title}</button>}
          </p>
        </section>
      </div>
      <p className="jr-sources">
        {journey.sources.map((s, i) => <span key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}</span>)}
      </p>
    </div>
  );
}

/** A hundred cells, filled from the bottom: of a hundred parts, this many are the element. */
function Waffle({ value, label }: { value: number; label: string }) {
  // under a tenth of one per cent, not even one cell is filled: the grid stays empty on purpose
  const filled = value < 0.1 ? 0 : Math.max(1, Math.min(100, Math.round(value)));
  return (
    <span className="jr-waffle" role="img" aria-label={label}>
      {Array.from({ length: 100 }, (_, k) => {
        const fromBottom = (9 - Math.floor(k / 10)) * 10 + (k % 10);
        return <i key={k} className={fromBottom < filled ? "on" : ""} style={{ "--k": fromBottom } as CSSProperties} />;
      })}
    </span>
  );
}

function Shares({ step }: { step: JourneyStep }) {
  const { caption, rows } = step.shares!;
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <figure className="jr-shares">
      <figcaption>{caption}</figcaption>
      {rows.map(([name, pct]) => (
        <div key={name}>
          <span>{name}</span>
          <i><b style={{ width: `${(pct / Math.max(max, 40)) * 100}%` }} /></i>
          <span className="num">{pct}%</span>
        </div>
      ))}
    </figure>
  );
}
