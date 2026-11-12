// A mineral's journey from the ground to the finished product, written stage by stage.
// One JSON file per mineral in this folder; a mineral without a file simply shows no journey.
// This is new explanatory content for the unified site (it comes from none of the three source
// repositories), so every figure in it carries a source listed in the same file.
import { useEffect, useState } from "react";
import type { Band } from "../data/types";

export interface JourneyStep {
  id: string;
  /** which part of the chain the step belongs to; sets its colour */
  band: Band | "demand";
  title: string;
  /** what the material is when it leaves this step; content is the element's share of it, in per cent */
  form?: { name: string; label: string; content: number };
  text: string;
  /** one line of chemistry, where a reaction is the heart of the step */
  chem?: string;
  /** what joins the chain here, such as the host metal of a by-product; names of minerals on this site become links */
  in?: string[];
  /** another road that some of the material takes from here */
  alt?: string;
  /** who holds this step: a caption and rows of [name, per cent] */
  shares?: { caption: string; rows: [string, number][] };
  india?: string;
  /** what else leaves the chain here; names of minerals on this site become links */
  out?: string[];
  /** numbers into sources, starting at 1 */
  refs?: number[];
}
export interface Journey { mineral: string; steps: JourneyStep[]; sources: { title: string; url?: string }[] }

const files = import.meta.glob<{ default: Journey }>("./*.json");
export const hasJourney = (name: string): boolean => `./${name}.json` in files;

export function useJourney(name: string | undefined): Journey | null {
  const [journey, setJourney] = useState<Journey | null>(null);
  useEffect(() => {
    setJourney(null);
    const load = name ? files[`./${name}.json`] : undefined;
    if (!load) return;
    let live = true;
    load().then((m) => { if (live) setJourney(m.default); });
    return () => { live = false; };
  }, [name]);
  return journey;
}
