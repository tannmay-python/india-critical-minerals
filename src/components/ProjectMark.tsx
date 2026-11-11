// One project as a small mark, the same encoding as the map: colour is the stage of the chain,
// fill is status (solid operating or licensed, open ring in progress, faded stopped), shape is
// kind (circle a project or site, square an auction block, diamond a cell plant or fab).
import type { Project, StatusGroup } from "../data/types";
import { BAND_COLOR } from "../lib/colors";

export const STATUS_LABEL: Record<StatusGroup, string> = {
  active: "Operating or licensed", pipeline: "In progress", inactive: "Annulled, stalled or closed",
};
export const STATUS_LABEL_ABROAD: Record<StatusGroup, string> = {
  active: "Operating or held", pipeline: "In progress", inactive: "Lost, withdrawn or stalled",
};
export const KIND_LABEL: Record<Project["kind"], string> = { site: "Project or site", block: "Auction block", demand: "Cell plant or fab" };

export function Mark({ kind, band, group, size = 12 }: { kind: Project["kind"]; band: Project["band"]; group: StatusGroup; size?: number }) {
  const c = BAND_COLOR[band];
  const ring = group === "pipeline";
  const s = size, m = s / 2, sw = ring ? Math.max(1.6, s * 0.17) : 0;
  const inset = sw / 2;
  const common = { fill: ring ? "#ffffff" : c, stroke: ring ? c : "none", strokeWidth: sw, opacity: group === "inactive" ? 0.35 : 1 };
  return (
    <svg className="mark" width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      {kind === "block" ? <rect x={inset + 0.5} y={inset + 0.5} width={s - 1 - sw} height={s - 1 - sw} rx={1} {...common} />
        : kind === "demand" ? <path d={`M${m} ${inset} L${s - inset} ${m} L${m} ${s - inset} L${inset} ${m} Z`} {...common} />
          : <circle cx={m} cy={m} r={m - inset - 0.25} {...common} />}
    </svg>
  );
}
