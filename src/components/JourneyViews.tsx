// Three other ways of showing a mineral's journey, built for the owner to compare with the boxes
// (12 Nov 2026). Whichever he picks stays; the rest are to be deleted.
//   Stepper: one stage at a time, with one large square that fills as the material gets purer.
//   Line:    the whole route as a transit line, with what joins, what leaves and the way back.
//   World:   a world map that shows who holds each stage.
import { geoArea, geoEqualEarth, geoPath } from "d3";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useData } from "../data/store";
import type { Journey, JourneyStep } from "../journeys";
import { BAND_COLOR } from "../lib/colors";
import { useSize } from "../lib/useSize";
import { Shares, Sources, StepNotes, useLinked, Waffle } from "./Journey";
import "./JourneyViews.css";

type Props = { journey: Journey; color: string };

/** What the material is at each step: its own form, or the latest one before it. */
function formsAlong(steps: JourneyStep[]): (JourneyStep["form"] | undefined)[] {
  const first = steps.find((s) => s.form)?.form;
  let last: JourneyStep["form"] | undefined;
  return steps.map((s) => { if (s.form) last = s.form; return last ?? first; });
}

function useStep(journey: Journey) {
  const [at, setAt] = useState(0);
  useEffect(() => setAt(0), [journey.mineral]);
  return [Math.min(at, journey.steps.length - 1), setAt] as const;
}

function Track({ journey, at, setAt }: { journey: Journey; at: number; setAt: (i: number) => void }) {
  return (
    <ol className="jv-track" style={{ "--n": journey.steps.length } as CSSProperties}>
      {journey.steps.map((s, i) => (
        <li key={s.id} style={{ "--band": BAND_COLOR[s.band] } as CSSProperties}>
          <button type="button" aria-current={i === at ? "step" : undefined} className={i < at ? "done" : ""} onClick={() => setAt(i)}>
            <i aria-hidden="true" /><span>{s.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function PrevNext({ journey, at, setAt }: { journey: Journey; at: number; setAt: (i: number) => void }) {
  const prev = journey.steps[at - 1], next = journey.steps[at + 1];
  return (
    <p className="jv-nav">
      {prev ? <button type="button" className="prev" onClick={() => setAt(at - 1)}>{prev.title}</button> : <span />}
      {next && <button type="button" className="next" onClick={() => setAt(at + 1)}>{next.title}</button>}
    </p>
  );
}

/* ───────────────────────────── one stage at a time ───────────────────────────── */

export function JourneyStepper({ journey, color }: Props) {
  const [at, setAt] = useStep(journey);
  const linked = useLinked(journey.mineral);
  const forms = useMemo(() => formsAlong(journey.steps), [journey]);
  const step = journey.steps[at];
  const form = forms[at];
  return (
    <div className="journey jv-stepper" style={{ "--el": color, "--band": BAND_COLOR[step.band] } as CSSProperties}>
      <Track journey={journey} at={at} setAt={setAt} />
      <div className={`jv-stage${form ? "" : " no-form"}`}>
        {form && (
          <figure className="jv-big">
            <Waffle value={form.content} label={`${form.name}: ${form.label}`} />
            <figcaption><b>{form.name}</b><span>{form.label}</span></figcaption>
          </figure>
        )}
        <div className="jv-body">
          <h3>{step.title}</h3>
          <p className="jv-text">{step.text}</p>
          <StepNotes step={step} linked={linked} />
          {step.india && <p className="jr-india"><b>India</b>{step.india}</p>}
        </div>
        <div className="jv-side">{step.shares && <Shares step={step} />}</div>
      </div>
      <PrevNext journey={journey} at={at} setAt={setAt} />
      <Sources journey={journey} />
    </div>
  );
}

/* ───────────────────────────── the route as a line ───────────────────────────── */

export function JourneyLine({ journey, color }: Props) {
  const [at, setAt] = useStep(journey);
  const linked = useLinked(journey.mineral);
  const steps = journey.steps;
  const n = steps.length;
  const step = steps[at];
  // scrap comes back in where processing starts
  const back = steps.findIndex((s) => s.band === "recycle");
  const reentry = steps.findIndex((s) => s.band === "process" || s.band === "make");
  const loop = back > 0 && reentry >= 0 && reentry < back ? { from: reentry, to: back } : null;
  return (
    <div className="journey jv-line" style={{ "--el": color, "--n": n } as CSSProperties}>
      <div className="jv-map">
        {loop && <i className="jv-loop" aria-hidden="true" style={{ "--a": loop.from, "--b": loop.to } as CSSProperties} />}
        {steps.map((s, i) => (
          <button type="button" key={s.id} className="jv-stop" aria-current={i === at ? "step" : undefined} onClick={() => setAt(i)}
            style={{ "--band": BAND_COLOR[s.band], "--next": BAND_COLOR[(steps[i + 1] ?? s).band] } as CSSProperties}>
            <span className="jv-name">{s.title}</span>
            <i className="jv-dot" aria-hidden="true" />
            {s.form && <span className="jv-grade"><b>{s.form.name}</b>{s.form.label}</span>}
          </button>
        ))}
        {steps.map((s, i) => (
          <div className="jv-branches" key={s.id} style={{ gridColumn: i + 1, "--band": BAND_COLOR[s.band] } as CSSProperties}>
            {s.in?.map((o) => <p className="in" key={o}>{linked(o)}</p>)}
            {s.alt && <p className="alt">{s.alt.split(/[.:]/)[0]}</p>}
            {s.out?.map((o) => <p className="out" key={o}>{linked(o)}</p>)}
          </div>
        ))}
      </div>
      <div className="jv-card" style={{ "--band": BAND_COLOR[step.band] } as CSSProperties}>
        <div className="jv-body">
          <h3>{step.title}</h3>
          <p className="jv-text">{step.text}</p>
          {step.chem && <p className="jr-chem">{step.chem}</p>}
          {step.alt && <p className="jr-alt">{step.alt}</p>}
          {step.india && <p className="jr-india"><b>India</b>{step.india}</p>}
        </div>
        <div className="jv-side">
          {step.form && <p className="jv-form"><Waffle value={step.form.content} label={`${step.form.name}: ${step.form.label}`} /><span><b>{step.form.name}</b>{step.form.label}</span></p>}
          {step.shares && <Shares step={step} />}
        </div>
      </div>
      <Sources journey={journey} />
    </div>
  );
}

/* ───────────────────────────── who holds each stage ───────────────────────────── */

interface WorldFeature { type: "Feature"; properties: { name: string }; geometry: GeoJSON.Geometry }
const ALIAS: Record<string, string> = { "DR Congo": "Democratic Republic of the Congo", "South Korea": "Republic of Korea", "North Korea": "Dem. Rep. Korea" };
const countryOf = (row: string) => { const n = row.replace(/\s*\(.*\)$/, ""); return ALIAS[n] ?? n; };

export function JourneyWorld({ journey, color }: Props) {
  const [at, setAt] = useStep(journey);
  const linked = useLinked(journey.mineral);
  const world = useData<{ features: WorldFeature[] }>("geo/world-ind-pov.geojson");
  const [ref, { width }] = useSize<HTMLDivElement>();
  const step = journey.steps[at];
  const height = Math.round(width * 0.5);

  const shapes = useMemo(() => {
    if (!world || !width) return [];
    // d3 reads ring direction; an outline wound the other way would cover the whole globe, so turn it round
    const rewound = (f: WorldFeature): WorldFeature => {
      if (geoArea(f as never) < 2 * Math.PI) return f;
      const flip = (rings: number[][][]) => rings.map((r) => [...r].reverse());
      const g = f.geometry;
      const geometry = g.type === "Polygon" ? { ...g, coordinates: flip(g.coordinates) } : g.type === "MultiPolygon" ? { ...g, coordinates: g.coordinates.map(flip) } : g;
      return { ...f, geometry: geometry as GeoJSON.Geometry };
    };
    const features = world.features.filter((f) => f.properties.name !== "Antarctica").map(rewound);
    const projection = geoEqualEarth().fitSize([width, height], { type: "FeatureCollection", features } as never);
    const path = geoPath(projection);
    // India is drawn last, so that its official outline lies on top of its neighbours'
    return [...features].sort((a, b) => Number(a.properties.name === "India") - Number(b.properties.name === "India")).map((f) => {
      // label at the middle of the country's largest piece
      let anchor = path.centroid(f as never);
      if (f.geometry.type === "MultiPolygon") {
        let best = 0;
        for (const coordinates of f.geometry.coordinates) {
          const piece = { type: "Polygon", coordinates } as never;
          const a = path.area(piece);
          if (a > best) { best = a; anchor = path.centroid(piece); }
        }
      }
      return { name: f.properties.name, d: path(f as never) ?? "", anchor };
    });
  }, [world, width, height]);

  const rows = step.shares?.rows ?? [];
  const known = new Set(shapes.map((s) => s.name));
  const onMap = rows.filter((r) => known.has(countryOf(r[0])));
  const share = new Map(onMap.map((r) => [countryOf(r[0]), r[1]]));
  const mapped = onMap.length > 0 && onMap.length >= rows.length - 1;
  const top = Math.max(1, ...onMap.map((r) => r[1]));
  const band = BAND_COLOR[step.band];

  return (
    <div className="journey jv-world" style={{ "--el": color, "--band": band } as CSSProperties}>
      <Track journey={journey} at={at} setAt={setAt} />
      <div className="jv-globe">
        <div className="jv-body">
          <h3>{step.title}</h3>
          {step.form && <p className="jv-form"><Waffle value={step.form.content} label={`${step.form.name}: ${step.form.label}`} /><span><b>{step.form.name}</b>{step.form.label}</span></p>}
          <p className="jv-text">{step.text}</p>
          <StepNotes step={step} linked={linked} />
          {step.india && <p className="jr-india"><b>India</b>{step.india}</p>}
        </div>
        <figure ref={ref} className="jv-atlas">
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={step.shares ? `${step.shares.caption}: ${rows.map((r) => `${r[0]} ${r[1]}%`).join(", ")}` : "World map"}>
              {shapes.map((s) => {
                const v = mapped ? share.get(s.name) : undefined;
                return <path key={s.name} d={s.d} className={s.name === "India" ? "india" : ""} style={v === undefined ? undefined : { fill: band, fillOpacity: 0.25 + 0.75 * (v / top) }} />;
              })}
              {mapped && shapes.filter((s) => share.has(s.name)).map((s) => (
                <text key={s.name} x={s.anchor[0]} y={s.anchor[1]} textAnchor="middle" dy="0.35em" className={(share.get(s.name) ?? 0) / top > 0.6 ? "strong" : ""}>{share.get(s.name)}%</text>
              ))}
            </svg>
          )}
          <figcaption>
            {step.shares ? <b>{step.shares.caption}</b> : <span>No country figures for this stage.</span>}
            {step.shares && !mapped && <Shares step={step} />}
            {mapped && <span>{onMap.map((r) => `${r[0].replace(/\s*\(.*\)$/, "")} ${r[1]}%`).join(" · ")}</span>}
          </figcaption>
        </figure>
      </div>
      <PrevNext journey={journey} at={at} setAt={setAt} />
      <Sources journey={journey} />
    </div>
  );
}
