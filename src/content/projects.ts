// Prose from the India Critical Minerals Project Map's About page, verbatim
// (sources/india-critical-minerals-map/src/ui/about.ts). scripts/check-content.mjs compares it.

export const PROJECTS_LEDE = "Where India's critical-minerals projects are, from auctioned blocks to magnet plants, and what Indian entities hold abroad. Every record cites dated sources.";

export const BAND_NOTE: Record<string, string> = {
  upstream: "auction blocks and mines",
  process: "smelters, refineries, processing parks",
  make: "battery materials, rare-earth and magnet plants",
  recycle: "battery and scrap recyclers",
  research: "Centres of Excellence and labs",
};

export const STATUS_KEY: { group: "active" | "pipeline" | "inactive"; text: string }[] = [
  { group: "active", text: "Solid: operating, licensed or held" },
  { group: "pipeline", text: "Open: in progress, from announcement to construction, or still at auction" },
  { group: "inactive", text: "Faded: annulled, stalled, closed, lost or withdrawn" },
];
export const SHAPE_KEY: { kind: "site" | "block" | "demand"; text: string }[] = [
  { kind: "site", text: "Circle: a project or site" },
  { kind: "block", text: "Square: an auction block, an area offered for exploration or mining" },
  { kind: "demand", text: "Diamond: a cell plant or fab using these minerals (off by default)" },
];

export const LAYERS: { id: string; label: string; what: string }[] = [
  { id: "blocks", label: "Auction blocks", what: "Critical-mineral blocks offered by the Centre and the states, with each tranche's outcome" },
  { id: "mines", label: "Mines", what: "Operating mines, including zinc-lead mines as cadmium sources" },
  { id: "processing", label: "Processing and refining", what: "Smelters, refineries, by-product recovery, silicon and processing parks" },
  { id: "materials", label: "Battery materials", what: "Cathode, anode, electrolyte, foil and other cell materials" },
  { id: "magnets", label: "Rare earths and magnets", what: "Rare-earth separation, metals and permanent-magnet plants" },
  { id: "recycling", label: "Recycling", what: "Registered battery recyclers and other critical-mineral recovery" },
  { id: "rnd", label: "Research", what: "Centres of Excellence and national labs" },
  { id: "overseas", label: "Abroad", what: "Assets Indian entities hold abroad, and their bids and evaluations" },
  { id: "demand", label: "Demand", what: "Cell plants of 1 GWh or more and gallium-using fabs (off by default)" },
];

export const YEAR_NOTE = "The year filter uses the year a record first became public: when it was announced, first put to auction or opened.";
export const LEFT_OUT = "Left out by design: coking coal; bauxite, manganese, chromite, zinc and lead except where they yield a listed critical mineral; lead-acid battery recycling; scrap copper refining; ferro-silicon; fertiliser phosphates.";
export const BOUNDARY_NOTE = "India's boundary: DataMeet composite (Survey of India depiction), CC0; states: DataMeet, CC BY 4.0; world: Natural Earth, India's point of view. Basemap: OpenFreeMap, OpenMapTiles, © OpenStreetMap contributors.";
