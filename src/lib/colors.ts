// Colour in one place. Values mirror src/styles/tokens.css (CSS cannot be read by canvas and SVG code).
import { interpolateLab } from "d3";
import type { Band } from "../data/types";

/** The six groups and the outlier. See tokens.css for why 3 to 6 differ slightly from the dashboard. */
export const GROUP_COLOR: Record<number, string> = {
  0: "#9a938a", 1: "#620d3c", 2: "#f1a222", 3: "#865634", 4: "#1d677f", 5: "#8874ae", 6: "#318f5a",
};
export const groupColor = (id: number): string => GROUP_COLOR[id] ?? GROUP_COLOR[0];

export const BAND_COLOR: Record<Band | "demand", string> = {
  upstream: "#b8860b", process: "#c8362b", make: "#3366cc", recycle: "#0f9b6e", research: "#9c3d9c", demand: "#4a3f38",
};

export const INK = "#1a0804";
export const PLUM = "#620d3c";
export const MARIGOLD = "#f1a222";
export const PAGE = "#fffbe2";

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
/** Ink for text set inside a colour fill: white or near-black, whichever reads. */
export const inkOn = (fill: string): string => {
  const l = luminance(toHex(fill));
  // whichever of near-black and white has the higher contrast with the fill
  return (l + 0.05) / (luminance(INK) + 0.05) >= 1.05 / (l + 0.05) ? INK : "#ffffff";
};

function toHex(color: string): string {
  if (color.startsWith("#")) return color;
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!m) return "#000000";
  return "#" + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("");
}

/** One-hue ramp for magnitude, light to dark plum. t in [0, 1]. */
const ramp = interpolateLab("#f3e6bd", PLUM);
export const sequential = (t: number): string => toHex(ramp(Math.max(0, Math.min(1, t))));
/** Five steps of the same ramp, for 1 to 5 scores. */
export const SEQ5 = [0.08, 0.3, 0.52, 0.76, 1].map(sequential);
