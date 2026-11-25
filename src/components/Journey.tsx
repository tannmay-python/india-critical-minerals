// A mineral's journey drawn as a route line: one stop per stage, from the deposit to the finished
// product. The line carries only the stage names and takes each stage's colour; a dashed arc shows
// scrap going back in. Everything else (the material, what joins, what leaves) is in the card that
// opens for the chosen stop, so that no label appears under some stops and not others. Arrows at
// either end step along the line; the chosen stop's name is filled in and the card points up at it.
// India's position is in the table under the line and the sources are at the foot of the page, so
// the "india" and "in" fields of a step stay in the data but are not drawn here.
import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
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
  const last = steps.length - 1;
  const stops = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const go = (i: number) => {
    const to = Math.max(0, Math.min(last, i));
    if (to === at) return;
    moved.current = true;
    setChosen(to);
  };
  // on phones the card opens under its stop, so keep it in view as the reader moves along
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (!matchMedia("(max-width: 900px)").matches) return;
    stage.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [at]);
  /** While the line has focus, the left and right keys move along it instead of changing the mineral. */
  const onKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement;
    if (ev.metaKey || ev.ctrlKey || ev.altKey || !target.closest(".jr-stop, .jr-arrow")) return;
    const to = ({ ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: last } as Record<string, number | undefined>)[ev.key];
    if (to === undefined) return;
    ev.preventDefault();
    go(to);
    if (target.classList.contains("jr-stop")) stops.current[Math.max(0, Math.min(last, to))]?.focus();
  };

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
    <div className="journey" style={{ "--el": color, "--n": steps.length, "--at": at } as CSSProperties}>
      <div className="jr-map" onKeyDown={onKey}>
        {loop && <i className="jr-loop" aria-hidden="true" style={{ "--a": loop.from, "--b": loop.to } as CSSProperties} />}
        <button type="button" className="jr-arrow prev" aria-label={prev ? `Back to ${prev.title}` : "Back"} title={prev?.title} aria-disabled={!prev} aria-controls="journey-stage" onClick={() => go(at - 1)} />
        {steps.map((s, i) => (
          <button type="button" key={s.id} ref={(el) => { stops.current[i] = el; }} className={i === last ? "jr-stop end" : "jr-stop"} aria-current={i === at ? "step" : undefined} aria-controls="journey-stage"
            tabIndex={i === at ? 0 : -1} onClick={() => go(i)}
            style={{ "--band": BAND_COLOR[s.band], "--next": BAND_COLOR[(steps[i + 1] ?? s).band], order: i * 2 } as CSSProperties}>
            <span className="jr-name">{s.title}</span>
            <i className="jr-dot" aria-hidden="true" />
          </button>
        ))}
        <button type="button" className="jr-arrow next" aria-label={next ? `On to ${next.title}` : "On"} title={next?.title} aria-disabled={!next} aria-controls="journey-stage" onClick={() => go(at + 1)} />
        <section id="journey-stage" ref={stage} className="jr-stage" aria-live="polite" style={{ "--band": BAND_COLOR[step.band], order: at * 2 + 1 } as CSSProperties}>
          <div className="jr-body">
            <h3>{step.title}</h3>
            <p className="jr-text">{linked(step.text)}</p>
            {step.chem && <p className="jr-chem">{step.chem}</p>}
            {step.alt && <p className="jr-alt">{step.alt}</p>}
            {step.out?.map((o) => <p className="jr-out" key={o}>{linked(o)}</p>)}
          </div>
          <div className="jr-side">
            {step.form && <p className="jr-form"><Waffle value={step.form.content} label={`${step.form.name}: ${step.form.label}`} /><span><b>{step.form.name}</b>{step.form.label}</span></p>}
            {step.shares && <Shares step={step} />}
          </div>
          <p className="jr-nav">
            {prev ? <button type="button" className="prev" onClick={() => go(at - 1)}>{prev.title}</button> : <span />}
            {next && <button type="button" className="next" onClick={() => go(at + 1)}>{next.title}</button>}
          </p>
        </section>
      </div>
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
