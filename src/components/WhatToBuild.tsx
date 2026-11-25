// What to build, drawn as a bridge: where India stands today, the span to cross (time to output
// above the arrow, difficulty for India below it) and the build itself, step by step. The
// capabilities and technologies it builds on follow as links, with their descriptions on hover.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useCore } from "../data/store";
import type { Mineral, MineralDetail } from "../data/types";
import { BAND_COLOR } from "../lib/colors";
import { fmtRange } from "../lib/format";
import { href, mineralHref } from "../lib/router";
import "./WhatToBuild.css";

type Cap = NonNullable<MineralDetail["capability"]>;

const STAGE_BAND: Record<string, keyof typeof BAND_COLOR> = { mine: "upstream", refine: "process", make: "make", use: "demand", recycle: "recycle" };
// the capability map's own scales, shown on hover
const TIME_NOTE = "Rough time to meaningful output";
const EASE_NOTE = "Difficulty for India. Easy: existing plants or licensing. Moderate: a new circuit or plant using proven technology. Hard: a new mine or a big technology gap.";

const tidy = (s: string) => {
  const t = s.trim().replace(/[;.]\s*$/, "").trim();
  if (!t) return t;
  // "As neodymium" means the same as for neodymium
  const same = /^As ([a-z]+)$/i.exec(t);
  if (same) return `Same as ${same[1][0].toUpperCase()}${same[1].slice(1)}`;
  return t[0].toUpperCase() + t.slice(1);
};

/** A line cut into its parts at semicolons and full stops that sit outside brackets:
 *  "Recover Tb from scrap; use diffusion; separation later." becomes three steps. */
function parts(text: string): string[] {
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

export function WhatToBuild({ cap, mineral }: { cap: Cap; mineral: Mineral }) {
  const link = useLinker(mineral.name);
  const band = BAND_COLOR[STAGE_BAND[cap.next_move_stage] ?? "process"];
  const clip = (s: string) => (s.length > 220 ? `${s.slice(0, 217).replace(/\s+\S*$/, "")}…` : s);
  return (
    <>
      <div className="wtb" style={{ "--band": band } as CSSProperties}>
        <div className="wtb-has">
          <h3>India today</h3>
          <ul>{parts(cap.what_india_has).map((f, i) => <li key={i}>{link(f)}</li>)}</ul>
        </div>
        <div className="wtb-span">
          <b title={TIME_NOTE}>{fmtRange(cap.time_to_output)}</b>
          <i aria-hidden="true" />
          <span title={EASE_NOTE}>{cap.ease}</span>
        </div>
        <div className="wtb-build">
          <h3>{cap.value_chain_step}</h3>
          <ol>{parts(cap.next_move).map((s, i) => <li key={i}>{link(s)}</li>)}</ol>
        </div>
      </div>
      {(cap.strategyList.length > 0 || cap.chemistryList.length > 0) && (
        <p className="wtb-on">
          <span>Builds on</span>
          {cap.strategyList.map((s) => <a key={s.id} href={href(`/capability/${s.slug}`)} title={s.what}>{s.name}</a>)}
          {cap.chemistryList.map((k) => (
            <a key={k.id} className="tech" href={href(`/technology/${k.slug}`)} title={clip((k.links[0] as { how?: string } | undefined)?.how ?? k.carries_over_to)}>{k.name}</a>
          ))}
        </p>
      )}
    </>
  );
}
