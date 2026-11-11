// Shapes of the JSON written by scripts/build-data.mjs. Keep in step with that script.

export type VectorKey =
  | "demand" | "growth" | "end_use" | "supplier_concentration" | "reserves"
  | "substitutability_recyclability" | "extraction_refining" | "upcoming_projects"
  | "india_position" | "price_volatility";

export type Band = "upstream" | "process" | "make" | "recycle" | "research";
export type StatusGroup = "active" | "pipeline" | "inactive";

export interface BandDef { id: Band; label: string; short: string; color: string }
export interface ScoreBand { score: number; label: string; note?: string }
export interface SubDef { key: string; name: string; max: number; note?: string }

export interface VectorDef {
  key: VectorKey; name: string; max: number; family: string; what: string;
  bands?: ScoreBand[]; sub?: SubDef[]; detail?: ScoreBand[] | Record<string, unknown> | null;
  [extra: string]: unknown;
}

export interface SubscoreDef { i: number; vector: VectorKey; sub: string | null; name: string; max: number; family: string }

export interface Group {
  id: number; name: string; sourceColor: string;
  tagline: string | null; body: string | null; policy: string[]; members: string[];
}

export interface CapabilityLight {
  id: string; step: string; nextMove: string; has: string; kinds: string[];
  complexity: number; ease: string; time: string; confidence: string;
  strategies: string[]; chemistry: string[];
}

export interface Mineral {
  name: string; symbol: string; z: number; row: number; col: number;
  group: number; lists: number;
  /** score or composite per vector */
  v: Record<VectorKey, number>;
  /** the fifteen sub-scores, in core.subscores order */
  s: number[];
  projects: {
    total: number; demand: number; abroad: number;
    byBand: Partial<Record<Band, number>>; byGroup: Partial<Record<StatusGroup, number>>; byStage: Record<string, number>;
  };
  capability: CapabilityLight | null;
}

/** [Z, symbol, name, row, col, category, isCritical] */
export type ElementRow = [number, string, string, number, number, "com" | "syn" | "rad" | "gas" | "hhe", 0 | 1];
export interface PtStep { num: number; label: string; pill: string; caption: string; removes?: string; highlightCritical?: boolean }
export interface ListSeries { label: string; data: [number, number][]; india: boolean }

export interface Dendrogram {
  leaves: { name: string; group: number; color: string; x: number }[];
  merges: { x1: number; x2: number; y1: number; y2: number; h: number; x: number; color?: string; group?: number | null; [k: string]: unknown }[];
  maxHeight: number; n: number;
  groups?: unknown;
}
export interface Matrix {
  groups: { id: number; name: string; color: string }[];
  rows: { label: string; max: number; cells: { g: number; v: number; max: boolean }[] }[];
}

export interface Core {
  meta: {
    built: string;
    sources: Record<"dashboard" | "map" | "capability", { commit: string; date: string; subject: string }>;
    mapBuilt: string; capabilityUpdated: string; capabilityResearch: string | null;
    counts: Record<string, number>;
  };
  groups: Group[];
  vectors: VectorDef[];
  subscores: SubscoreDef[];
  minerals: Mineral[];
  elements: ElementRow[];
  ptSteps: PtStep[];
  /** how many of five national lists name each element, by symbol */
  ptLists: Record<string, number>;
  listsSeries: ListSeries[];
  endUseSectors: unknown[]; endUseBreadth: unknown[];
  matrix: Matrix;
  dendrogram: Dendrogram;
  stages: { id: string; order: number; description: string }[];
  bands: BandDef[];
  stageBand: Record<string, Band>;
  demandColor: string;
  mapMinerals: { name: string; symbol: string | null; family: "REE" | "PGE" | null; umbrella: boolean; members: string[] | null; lists: { goi_critical_2023: boolean; mmdr_part_d: boolean } }[];
}

export interface Project {
  id: string; name: string; layer: string; kind: "block" | "site" | "demand";
  stages: string[]; stage: string; band: Band | "demand";
  minerals: string[]; tagged: string[];
  status: string; group: StatusGroup; asOf: string; detail: string | null;
  state: string | null; district: string | null; country: string | null; abroad: boolean;
  lat: number | null; lon: number | null; precision: string | null;
  operator: string | null; operatorType: string | null;
  year: number | null; confidence: "high" | "medium" | "low";
  schemes: string[]; geometry: boolean;
  promise: { state: "delivered" | "revised" | "overdue" | "pending"; months: number } | null;
  /** each time the block was offered: tranche id, outcome, and the notice (or outcome) date */
  tranches: { t: string; o: string; d: string | null }[]; route: string | null; lastOutcome: string | null;
  investment: { amount: number | string; currency: string | null } | null;
  link: [number, number] | null;
  does: string | null;
}

export interface Source {
  id: string; url: string; title: string; publisher: string; tier: "T1" | "T2" | "T3" | "T4" | "T5";
  date: string | null; archive_url: string | null; supports: string[];
}
export interface Quantity { value: number | string | null; unit: string | null; basis?: string | null; phase?: string | null }
export interface AuctionOffer {
  tranche: string; nit_date: string | null; outcome: string; outcome_date: string | null;
  annulment_reason: string | null; preferred_bidder: string | null; final_offer_pct: number | null; reserve_price: string | number | null;
}
/** A full project record, as the map's own build writes it. */
export interface Entity {
  id: string; name: string; aliases: string[]; layer: string; stages: string[];
  minerals: string[]; minerals_expanded: string[]; commodity_as_stated: string | null; products: string[];
  operator: string | null; operator_type: string | null;
  owners: { entity: string; stake_pct: number | null }[];
  partners: { name: string; country?: string; role?: string }[];
  location: { address: string | null; village_or_town: string | null; district: string | null; state: string | null; country: string | null; precision: string };
  lat: number | null; lon: number | null; has_geometry: boolean;
  status: string; status_group: StatusGroup; status_as_of: string; status_detail: string | null;
  capacity?: { planned?: Quantity; installed?: Quantity } | null;
  investment?: { amount: number | string | null; currency: string | null; basis: string | null } | null;
  feedstock: string | null; feedstock_detail: string | null;
  schemes: string[]; scheme_status: Record<string, string>;
  scheme_links: { id: string; name: string; role: "beneficiary" | "bidder" }[];
  dates: Record<string, string | null>;
  milestones: { date: string; event: string; source_id?: string }[];
  narrative: { significance?: string; what_it_does?: string; why_it_matters?: string };
  related: string[]; see_also: string[]; confidence: "high" | "medium" | "low"; last_verified: string; notes: string | null;
  sources: Source[];
  slippage_months: number | null; stalled_flag: boolean;
  promise: { state: "delivered" | "revised" | "overdue" | "pending"; months: number; due: string; now: string | null; done: string | null; restart: boolean } | null;
  block_lag_months: { pb_to_lease: number | null; lease_to_production: number | null } | null;
  block?: { concession_type: string; auction_route: string; area_sq_km: number | null; exploration_stage: string | null;
    resources?: { mineral: string; quantity: number | string | null; unit: string | null; grade: string | null; category: string | null }[]; resources_as_stated?: string | null };
  auction?: { history: AuctionOffer[]; loi_date: string | null; licence_or_lease_executed: string | null; production_started: string | null };
  overseas?: { host_country: string; host_region: string | null; indian_entities: string[]; stake_pct: number | null; deal_type: string; india_link: { city: string; lat: number; lon: number } };
  rnd?: { institution_type: string; programmes: string[]; focus: string[]; funding?: { amount: number | null; currency: string | null; funder: string | null } };
  demand?: { product: string; capacity_gwh: number | null; inputs: string[] };
}

export interface ScoreDetail { score?: number; composite?: number; max: number; reason: string; sub?: Record<string, number> }

export interface CapSource { id: string; title: string; url: string; type: string; published?: string | null; used_by?: { kind: string; id: string }[] }
export interface ChainStage { stage: "mine" | "refine" | "make" | "use"; world: string; india: string; india_level?: number }
export interface Strategy {
  id: string; number: number; slug: string; name: string; what: string; minerals_text: string; minerals: string[];
  outside_china: string; complexity: string; cost: string; india_base: string; gap: string; sources: string[];
}
export interface GuideBlock { [k: string]: unknown; refs?: string[] }
export interface Guide {
  summary?: string; [section: string]: unknown;
  what?: GuideBlock[]; value_chain?: GuideBlock[]; actors?: GuideBlock[]; mineral_links?: (GuideBlock & { minerals: string[] })[];
  expansion?: GuideBlock[]; constraints?: GuideBlock[]; related_strategies?: string[]; source_ids?: string[];
}
export interface Chemistry {
  id: string; slug: string; name: string; who: string; carries_over_to: string; minerals_text: string; minerals: string[];
  fit: string; sources: string[]; guide?: Guide;
}
export interface CapMineral {
  id: string; name: string; symbol: string; group: number; dashboard_url: string;
  next_move: string; next_move_stage: string; value_chain_step: string; what_india_has: string; kinds: string[];
  complexity: number; ease: string; cost: string; time_to_output: string; confidence: string;
  stages: ChainStage[]; strategies: string[]; chemistry: string[]; sources: string[];
}
export interface Capability {
  meta: Record<string, unknown> & { stages: { id: string; short: string; label: string }[]; notes: { title: string; text: string }[]; scales: Record<string, string> };
  groups: { id: number; name: string; color: string; tagline: string; minerals: string[] }[];
  minerals: CapMineral[];
  strategies: Strategy[];
  chemistry: Chemistry[];
  sources: CapSource[];
}

export interface MineralDetail {
  name: string;
  vectors: Record<VectorKey, ScoreDetail>;
  capability: (CapMineral & {
    strategyList: Pick<Strategy, "id" | "number" | "slug" | "name" | "what" | "outside_china" | "complexity" | "cost" | "india_base" | "gap">[];
    chemistryList: { id: string; slug: string; name: string; who: string; carries_over_to: string; fit: string; summary: string | null; links: GuideBlock[] }[];
    sourceList: { id: string; title: string; url: string; type: string; published: string | null }[];
    estimates: { mineral: string; text: string }[];
  }) | null;
  projects: string[];
}

export interface SearchItem { t: "mineral" | "project" | "capability" | "technology"; id: string; n: string; x: string }
