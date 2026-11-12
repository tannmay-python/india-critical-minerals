// The mineral's journey as a flow chart: one box per stage, in order, from the deposit to the
// finished product and back through scrap. The square of a hundred cells in a box shows how much
// of the material is the element itself at that point, so the climb from ore to metal can be seen.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Journey as JourneyData, JourneyStep } from "../journeys";
import { BAND_COLOR } from "../lib/colors";
import { mineralHref } from "../lib/router";
import "./Journey.css";

/** Minerals on this site that are named in a line become links to their pages. */
export function useLinked(self: string): (text: string) => ReactNode {
  const core = useCore();
  return (text) => {
    const names = core.minerals.map((m) => m.name).filter((n) => n !== self);
    const parts = text.split(new RegExp(`\\b(${names.join("|")})\\b(?!-)`, "i"));
    return parts.map((part, i) => {
      const hit = i % 2 === 1 ? names.find((n) => n.toLowerCase() === part.toLowerCase()) : undefined;
      return hit ? <a key={i} href={mineralHref(hit)}>{part}</a> : <Fragment key={i}>{part}</Fragment>;
    });
  };
}

/** The reaction and the side lines of a step: what joins, the other road, what leaves. */
export function StepNotes({ step, linked }: { step: JourneyStep; linked: (t: string) => ReactNode }) {
  return (
    <>
      {step.chem && <p className="jr-chem">{step.chem}</p>}
      {step.in?.map((o) => <p className="jr-in" key={o}>{linked(o)}</p>)}
      {step.alt && <p className="jr-alt">{step.alt}</p>}
      {step.out?.map((o) => <p className="jr-out" key={o}>{linked(o)}</p>)}
    </>
  );
}

export function Sources({ journey }: { journey: JourneyData }) {
  return (
    <p className="jr-sources">
      {journey.sources.map((s, i) => <span key={i}>{s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}</span>)}
    </p>
  );
}

export function Journey({ journey, color }: { journey: JourneyData; color: string }) {
  const linked = useLinked(journey.mineral);
  return (
    <div className="journey" style={{ "--el": color } as CSSProperties}>
      <ol className="jr-flow">
        {journey.steps.map((s, i) => (
          <Fragment key={s.id}>
            <li className="jr-step" style={{ "--band": BAND_COLOR[s.band] } as CSSProperties}>
              <header>
                <div>
                  <h3>{s.title}</h3>
                  {s.form && <p className="jr-form"><b>{s.form.name}</b><span>{s.form.label}</span></p>}
                </div>
                {s.form && <Waffle value={s.form.content} label={`${s.form.name}: ${s.form.label}`} />}
              </header>
              <p className="jr-text">{s.text}</p>
              <StepNotes step={s} linked={linked} />
              {s.shares && <Shares step={s} />}
              {s.india && <p className="jr-india"><b>India</b>{s.india}</p>}
            </li>
            {/* where a row of the chart ends, the line turns back to the start of the next */}
            {i % 2 === 1 && i < journey.steps.length - 1 && <li className={`jr-turn${i % 4 === 3 ? " four" : ""}`} aria-hidden="true"><i /></li>}
          </Fragment>
        ))}
      </ol>
      <Sources journey={journey} />
    </div>
  );
}

/** A hundred cells, filled from the bottom: of a hundred parts, this many are the element. */
export function Waffle({ value, label }: { value: number; label: string }) {
  // under a tenth of one per cent, not even one cell is filled: the grid stays empty on purpose
  const filled = value < 0.1 ? 0 : Math.max(1, Math.min(100, Math.round(value)));
  return (
    <span className="jr-waffle" role="img" aria-label={label}>
      {Array.from({ length: 100 }, (_, k) => {
        const row = Math.floor(k / 10), col = k % 10;
        const fromBottom = (9 - row) * 10 + col;
        return <i key={k} className={fromBottom < filled ? "on" : ""} style={{ "--k": fromBottom } as CSSProperties} />;
      })}
    </span>
  );
}

export function Shares({ step }: { step: JourneyStep }) {
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
