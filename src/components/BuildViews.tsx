// Temporary: four ways to lay out "What to build", to compare on the mineral page and pick one.
// The one picked replaces the section; the others and the switcher go.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Mineral, MineralDetail } from "../data/types";
import { BAND_COLOR, groupColor, inkOn } from "../lib/colors";
import { fmtRange } from "../lib/format";
import { href, mineralHref } from "../lib/router";
import "./BuildViews.css";

type Cap = NonNullable<MineralDetail["capability"]>;

export const BUILD_VIEWS = [
  { id: "check", label: "Checklist" },
  { id: "bridge", label: "Bridge" },
  { id: "road", label: "Roadmap" },
  { id: "map", label: "Effort map" },
  { id: "now", label: "Current" },
] as const;
export type BuildView = (typeof BUILD_VIEWS)[number]["id"];

const STAGE_BAND: Record<string, keyof typeof BAND_COLOR> = { mine: "upstream", refine: "process", make: "make", use: "demand", recycle: "recycle" };
const TIMES = ["0-3 yrs", "3-7 yrs", "7+ yrs"];
const EASE = ["Easy", "Moderate", "Hard"];
// where each time window sits on the roadmap's axis, which runs from today to ten years and more
const WINDOW: Record<string, [number, number]> = { "0-3 yrs": [0, 0.3], "3-7 yrs": [0.3, 0.7], "7+ yrs": [0.7, 1] };

const tidy = (s: string) => {
  const t = s.trim().replace(/[;.]\s*$/, "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
};

/** A line cut into its parts at semicolons and full stops that sit outside brackets:
 *  "Recover Tb from scrap; use diffusion; separation later." becomes three actions. */
function facts(text: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    cur += ch;
    const sentenceEnd = ch === "." && text[i + 1] === " " && /[A-Z0-9]/.test(text[i + 2] ?? "") && !/\b(Rs|No|vs|e\.g|i\.e|cf|approx|St|Mt|Dr|Co|Ltd|Inc)\.$/.test(cur);
    if (depth === 0 && (ch === ";" || sentenceEnd)) { out.push(tidy(cur)); cur = ""; }
  }
  if (cur.trim()) out.push(tidy(cur));
  return out.filter(Boolean);
}

/** Minerals named in a line link to their pages, each once. */
function useLinker(self: string) {
  const core = useCore();
  const names = core.minerals.map((m) => m.name).filter((n) => n !== self);
  const pattern = new RegExp(`\\b(${names.join("|")})\\b(?!-)`, "i");
  return (text: string): ReactNode => {
    const seen = new Set<string>();
    return text.split(pattern).map((part, i) => {
      const hit = i % 2 === 1 ? names.find((n) => n.toLowerCase() === part.toLowerCase()) : undefined;
      if (!hit || seen.has(hit)) return <Fragment key={i}>{part}</Fragment>;
      seen.add(hit);
      return <a key={i} href={mineralHref(hit)}>{part}</a>;
    });
  };
}

interface Props { view: Exclude<BuildView, "now">; cap: Cap; mineral: Mineral; cost: ReactNode }

export function BuildViews({ view, cap, mineral, cost }: Props) {
  const link = useLinker(mineral.name);
  const band = BAND_COLOR[STAGE_BAND[cap.next_move_stage] ?? "process"];
  // "As neodymium." means the same next move as neodymium
  const same = /^As ([A-Z][a-z]+)\.?$/i.exec(cap.next_move.trim());
  const steps = same ? [`Same as ${same[1][0].toUpperCase()}${same[1].slice(1)}`] : facts(cap.next_move);
  const headline = same ? steps[0] : cap.next_move;
  const has = facts(cap.what_india_has);
  const style = { "--band": band } as CSSProperties;

  if (view === "check") return (
    <div style={style}>
      <div className="wb-check">
        <ol className="wb-list">
          {/* "No domestic mine" is a gap, not something in hand, so it gets a dash instead of a tick */}
          {has.map((f, i) => <li key={`h${i}`} className={/^(no|none|nothing)\b/i.test(f) ? "gap" : "done"}><i className="wb-mark" aria-hidden="true" />{link(f)}</li>)}
          {steps.map((s, i) => <li key={`s${i}`} className="todo"><i className="wb-mark" aria-hidden="true" />{link(s)}</li>)}
        </ol>
        <Effort cap={cap} cost={cost} />
      </div>
      <BuildsOn cap={cap} />
    </div>
  );

  if (view === "bridge") return (
    <div style={style}>
      <div className="wb-bridge">
        <div className="wb-has">
          <h3>India today</h3>
          <ul className="wb-facts">{has.map((f, i) => <li key={i}>{link(f)}</li>)}</ul>
        </div>
        <div className="wb-arrow">
          <b>{fmtRange(cap.time_to_output)}</b>
          <i aria-hidden="true" />
          <span>{cap.ease}</span>
        </div>
        <div className="wb-next">
          <h3>{cap.value_chain_step}</h3>
          <ol>{steps.map((s, i) => <li key={i}>{link(s)}</li>)}</ol>
        </div>
      </div>
      <Effort cap={cap} cost={cost} skip={["time", "ease"]} row />
      <BuildsOn cap={cap} />
    </div>
  );

  if (view === "road") {
    const [from, to] = WINDOW[cap.time_to_output] ?? [0.3, 0.7];
    return (
      <div style={style}>
        <p className="wb-headline">{link(headline)}</p>
        <div className="wb-axis" style={{ "--from": from, "--to": to } as CSSProperties}>
          <b className={`wb-band${to === 1 ? " late" : ""}`}><span>{cap.value_chain_step}</span></b>
          <i className="wb-now" aria-hidden="true" />
          <span className="wb-tick first">Today</span>
          <span className="wb-tick" style={{ "--x": 0.3 } as CSSProperties}>3 yrs</span>
          <span className="wb-tick" style={{ "--x": 0.7 } as CSSProperties}>7 yrs</span>
          <span className="wb-tick last">10+ yrs</span>
        </div>
        <div className="wb-split">
          <div>
            <h3 className="wb-small">India today</h3>
            <ul className="wb-facts">{has.map((f, i) => <li key={i}>{link(f)}</li>)}</ul>
          </div>
          <Effort cap={cap} cost={cost} skip={["time"]} />
        </div>
        <BuildsOn cap={cap} />
      </div>
    );
  }

  return (
    <div style={style}>
      <div className="wb-map">
        <EffortMap mineral={mineral} />
        <div>
          <p className="wb-headline">{link(headline)}</p>
          <h3 className="wb-small">India today</h3>
          <ul className="wb-facts">{has.map((f, i) => <li key={i}>{link(f)}</li>)}</ul>
          <Effort cap={cap} cost={cost} skip={["time", "complexity"]} />
        </div>
      </div>
      <BuildsOn cap={cap} />
    </div>
  );
}

/** Segments filled from the left: more filled is longer, harder or more complex. */
function Meter({ of, on }: { of: number; on: number }) {
  return <span className="wb-meter" aria-hidden="true">{Array.from({ length: of }, (_, i) => <i key={i} className={i < on ? "on" : ""} />)}</span>;
}

function Effort({ cap, cost, skip = [], row }: { cap: Cap; cost: ReactNode; skip?: ("time" | "ease" | "complexity")[]; row?: boolean }) {
  return (
    <dl className={`wb-effort${row ? " row" : ""}`}>
      {!skip.includes("time") && <div><dt>Time to output</dt><dd><Meter of={3} on={TIMES.indexOf(cap.time_to_output) + 1} />{fmtRange(cap.time_to_output)}</dd></div>}
      {!skip.includes("ease") && <div><dt>Difficulty for India</dt><dd><Meter of={3} on={EASE.indexOf(cap.ease) + 1} />{cap.ease}</dd></div>}
      {!skip.includes("complexity") && <div><dt>Process complexity</dt><dd><Meter of={5} on={cap.complexity} />{cap.complexity} of 5</dd></div>}
      <div className="plain"><dt>Indicative cost</dt><dd>{cost}</dd></div>
      <div className="plain"><dt>Confidence</dt><dd>{cap.confidence}</dd></div>
    </dl>
  );
}

function BuildsOn({ cap }: { cap: Cap }) {
  if (!cap.strategyList.length && !cap.chemistryList.length) return null;
  const clip = (s: string) => (s.length > 220 ? `${s.slice(0, 217).replace(/\s+\S*$/, "")}…` : s);
  return (
    <div className="wb-on">
      <span>Builds on</span>
      {cap.strategyList.map((s) => <a key={s.id} className="wb-chip" href={href(`/capability/${s.slug}`)} title={s.what}>{s.name}</a>)}
      {cap.chemistryList.map((k) => (
        <a key={k.id} className="wb-chip tech" href={href(`/technology/${k.slug}`)} title={clip((k.links[0] as { how?: string } | undefined)?.how ?? k.carries_over_to)}>{k.name}</a>
      ))}
    </div>
  );
}

/** Every mineral's next move placed by time to output and process complexity; this one stands out. */
function EffortMap({ mineral }: { mineral: Mineral }) {
  const core = useCore();
  const rows = [...TIMES].reverse();
  const here = mineral.capability;
  return (
    <figure className="wb-mapfig">
      <div className="wb-grid">
        <span className="wb-ytitle">Time to output</span>
        {rows.map((t) => (
          <Fragment key={t}>
            <span className="wb-ylab">{fmtRange(t)}</span>
            {[1, 2, 3, 4, 5].map((k) => {
              const cell = core.minerals.filter((m) => m.capability?.time === t && m.capability.complexity === k).sort((a, b) => a.z - b.z);
              const isHere = here?.time === t && here.complexity === k;
              return (
                <div key={k} className={`wb-cell${isHere ? " here" : ""}`}>
                  {cell.map((m) => {
                    const c = groupColor(m.group);
                    return <a key={m.name} className={`wb-tile${m.name === mineral.name ? " me" : ""}`} href={mineralHref(m.name)} title={`${m.name}: ${m.capability!.nextMove}`} style={{ background: c, color: inkOn(c) }}>{m.symbol}</a>;
                  })}
                </div>
              );
            })}
          </Fragment>
        ))}
        <span />
        {[1, 2, 3, 4, 5].map((k) => <span key={k} className="wb-xlab num">{k}</span>)}
      </div>
      <figcaption>Extraction and refining complexity</figcaption>
    </figure>
  );
}
