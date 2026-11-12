#!/usr/bin/env node
/*
 * Builds the site's data from the three source repositories, which are never modified.
 *
 *   ../sources/crit-minerals-dashboard      scores, reasons, groups, criteria, periodic table
 *   ../sources/india-critical-minerals-map  project records (its own build must have run: public/data)
 *   ../sources/india-capability-map         value chains, strategies, technology guides
 *
 * Every value is copied; nothing is retyped or recomputed here except counts, which are
 * labelled as derived. Output: public/data/*.json (ignored by git; rebuild with `npm run data`).
 */
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = process.env.ICM_SOURCES ? path.resolve(process.env.ICM_SOURCES) : path.resolve(ROOT, '..', 'sources');
const DASH = path.join(SRC, 'crit-minerals-dashboard');
const MAP = path.join(SRC, 'india-critical-minerals-map');
const CAP = path.join(SRC, 'india-capability-map');
const OUT = path.join(ROOT, 'public', 'data');

const readJSON = async (p) => JSON.parse(await readFile(p, 'utf8'));
const writeJSON = async (name, value) => {
  const file = path.join(OUT, name);
  await mkdir(path.dirname(file), { recursive: true });
  const text = JSON.stringify(value);
  await writeFile(file, text);
  return text.length;
};
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const sourceInfo = (dir) => ({ commit: git(dir, 'rev-parse', '--short', 'HEAD'), date: git(dir, 'log', '-1', '--format=%cs'), subject: git(dir, 'log', '-1', '--format=%s') });

// ---------------------------------------------------------------------------------------------
// Literals that live in the dashboard's JavaScript are evaluated in a sandbox, never retyped.
// ---------------------------------------------------------------------------------------------
function literalIn(src, name) {
  const m = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*').exec(src);
  if (!m) throw new Error(`declaration not found: ${name}`);
  const start = m.index + m[0].length;
  const open = src[start];
  if (open !== '{' && open !== '[') throw new Error(`${name} is not an object or array literal`);
  const close = open === '{' ? '}' : ']';
  let depth = 0, quote = null, escaped = false;
  for (let j = start; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && src[j + 1] === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return src.slice(start, j + 1);
  }
  throw new Error(`unterminated literal: ${name}`);
}
const evalLiteral = (src, name) => vm.runInNewContext('(' + literalIn(src, name) + ')', {}, { timeout: 2000 });

// ---------------------------------------------------------------------------------------------
// Stage bands: the map's own encoding (src/lib/bands.ts), read from its source so it cannot drift.
// ---------------------------------------------------------------------------------------------
async function readBands() {
  const src = await readFile(path.join(MAP, 'src/lib/bands.ts'), 'utf8');
  const bands = vm.runInNewContext('(' + /export const BANDS[^=]*=\s*(\[[\s\S]*?\]);/.exec(src)[1] + ')');
  const stageBand = vm.runInNewContext('(' + /const STAGE_BAND[^=]*=\s*(\{[\s\S]*?\});/.exec(src)[1] + ')');
  const demandColor = /DEMAND_COLOR\s*=\s*"(#[0-9a-fA-F]{6})"/.exec(src)[1];
  return { bands, stageBand, demandColor };
}
// The map's rule for the stage a record is coloured by (src/data.ts primaryStage).
const LAYER_STAGE = { blocks: 'Exploration', mines: 'Mining', processing: 'Refining', materials: 'Materials', magnets: 'Magnets', recycling: 'Recycling', rnd: 'R&D', demand: 'Cells & Devices' };
const primaryStage = (e) => (LAYER_STAGE[e.layer] && e.stages.includes(LAYER_STAGE[e.layer]) ? LAYER_STAGE[e.layer] : e.stages[0] ?? 'Exploration');

// The fifteen scores in the order the dashboard's clustering uses (tools/regenerate_derived.py scores15).
const SUBSCORES = [
  ['demand', null], ['growth', null],
  ['supplier_concentration', 'mining_diversity'], ['supplier_concentration', 'refining_diversity'],
  ['reserves', 'timeframe'], ['reserves', 'diversification'],
  ['end_use', 'sectoral'], ['end_use', 'breadth'],
  ['substitutability_recyclability', 'substitutability'], ['substitutability_recyclability', 'recyclability'],
  ['extraction_refining', null], ['upcoming_projects', null],
  ['india_position', 'import_dependence'], ['india_position', 'strategic_posture'],
  ['price_volatility', null],
];

async function main() {
  for (const [dir, need] of [[DASH, 'data/minerals_data.json'], [MAP, 'public/data/entities.json'], [CAP, 'capability_map.json']]) {
    if (!existsSync(path.join(dir, need))) {
      throw new Error(`Missing ${path.join(dir, need)}.\n` + (dir === MAP
        ? 'Build the map data first: in sources/india-critical-minerals-map run\n  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python -I scripts/build-data.py'
        : 'Check that the three repositories are cloned under ../sources.'));
    }
  }
  // The capability map's own build merges the workbook data with the technology guides (writes only dist/).
  execFileSync('node', ['scripts/build.mjs'], { cwd: CAP, stdio: 'ignore' });

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // ---- dashboard ---------------------------------------------------------------------------
  const scored = (await readJSON(path.join(DASH, 'data/minerals_data.json'))).minerals;
  const criteria = await readJSON(path.join(DASH, 'data/criteria_data.json'));
  const groupOf = await readJSON(path.join(DASH, 'data/group_assignments.json'));
  const appJs = await readFile(path.join(DASH, 'app.js'), 'utf8');
  const lit = (name) => evalLiteral(appJs, name);
  const groupText = lit('GROUP_DESCRIPTIONS');
  const elements = lit('PT_ELEMENTS');
  const ptSteps = lit('PT_STEPS');
  const ptLists = lit('PT_LISTS');
  const ptAlias = lit('PT_GROUP_ALIAS'); // Carbon -> Graphite, Potassium -> Potash
  const completeBands = lit('COMPLETE_BANDS');
  const endUseSectors = lit('ENDUSE_SECTORS');
  const endUseBreadth = lit('ENDUSE_BREADTH');
  const listsFn = appJs.slice(appJs.indexOf('function renderListsChart()'));
  const listsSeries = evalLiteral(listsFn, 'series').map(({ label, data, india }) => ({ label, data, india: Boolean(india) }));
  const dendrogram = evalLiteral(await readFile(path.join(DASH, 'dendrogram-data.js'), 'utf8'), 'DENDRO');
  const matrix = evalLiteral(await readFile(path.join(DASH, 'matrix-data.js'), 'utf8'), 'MATRIX');

  const elementByMineral = new Map();
  for (const [z, symbol, name, row, col] of elements) elementByMineral.set(ptAlias[name] ?? name, { z, symbol, row, col });

  // ---- capability map ----------------------------------------------------------------------
  const cap = await readJSON(path.join(CAP, 'dist/capability_map.json'));
  // The owner's map covers 26 minerals (groups 1, 2 and 5). The other 25 are in a supplement written
  // for this site on 12 Nov 2026 (content/capability-supplement.json): same fields, kept apart from the
  // workbook and marked `supplement` so that the two can always be told apart.
  const supplement = await readJSON(path.join(ROOT, 'content/capability-supplement.json')).catch(() => null);
  if (supplement) {
    const knownSources = new Set(cap.sources.map((s) => s.id));
    for (const src of supplement.sources) if (!knownSources.has(src.id)) cap.sources.push({ ...src, used_by: [], supplement: true });
    for (const m of supplement.minerals) {
      if (cap.minerals.some((x) => x.id === m.id)) continue;
      cap.minerals.push({ ...m, supplement: true });
      for (const sid of m.strategies) { const st = cap.strategies.find((x) => x.id === sid); if (st && !st.minerals.includes(m.id)) st.minerals.push(m.id); }
      for (const kid of m.chemistry) { const k = cap.chemistry.find((x) => x.id === kid); if (k && !k.minerals.includes(m.id)) k.minerals.push(m.id); }
      for (const sid of m.sources) { const src = cap.sources.find((x) => x.id === sid); if (src) (src.used_by ??= []).push({ kind: 'mineral', id: m.id }); }
    }
    cap.meta.supplement = supplement.meta;
  }
  const capByName = new Map(cap.minerals.map((m) => [m.name, m]));

  // ---- project map -------------------------------------------------------------------------
  const mapData = path.join(MAP, 'public/data');
  const entities = await readJSON(path.join(mapData, 'entities.json'));
  const mapMinerals = await readJSON(path.join(mapData, 'minerals.json'));
  const stages = await readJSON(path.join(mapData, 'stages.json'));
  const { bands, stageBand, demandColor } = await readBands();
  const bandOf = (e) => (e.layer === 'demand' ? 'demand' : stageBand[primaryStage(e)] ?? 'upstream');
  const umbrellas = new Map(mapMinerals.filter((m) => m.umbrella).map((m) => [m.name, m.members ?? []]));
  const mineralsOf = (e) => {
    const out = new Set([...(e.minerals ?? []), ...(e.minerals_expanded ?? [])]);
    for (const m of e.minerals ?? []) for (const x of umbrellas.get(m) ?? []) out.add(x);
    return [...out].filter((m) => !umbrellas.has(m)).sort();
  };
  const yearOf = (e) => Number((e.dates?.first_public ?? '').slice(0, 4)) || null;

  const projects = entities.map((e) => {
    const last = e.auction?.history?.length ? e.auction.history[e.auction.history.length - 1] : null;
    return {
      id: e.id,
      name: e.name,
      layer: e.layer,
      kind: e.layer === 'blocks' ? 'block' : e.layer === 'demand' ? 'demand' : 'site',
      stages: e.stages,
      stage: e.layer === 'demand' ? 'Cells & Devices' : primaryStage(e),
      band: bandOf(e),
      minerals: mineralsOf(e),
      tagged: e.minerals,
      status: e.status,
      group: e.status_group,
      asOf: e.status_as_of,
      detail: e.status_detail ?? null,
      state: e.location?.state ?? null,
      district: e.location?.district ?? null,
      country: e.location?.country ?? null,
      abroad: e.layer === 'overseas',
      lat: e.lat,
      lon: e.lon,
      precision: e.location?.precision ?? null,
      operator: e.operator ?? null,
      operatorType: e.operator_type ?? null,
      year: yearOf(e),
      confidence: e.confidence,
      schemes: (e.scheme_links ?? []).map((s) => s.id),
      geometry: Boolean(e.has_geometry),
      promise: e.promise ? { state: e.promise.state, months: e.promise.months } : null,
      tranches: (e.auction?.history ?? []).map((h) => ({ t: h.tranche, o: h.outcome, d: h.nit_date ?? h.outcome_date ?? null })),
      route: e.block?.auction_route ?? null,
      lastOutcome: last ? last.outcome : null,
      investment: e.investment?.amount != null ? { amount: e.investment.amount, currency: e.investment.currency } : null,
      link: e.overseas?.india_link ? [e.overseas.india_link.lon, e.overseas.india_link.lat] : null,
      does: e.narrative?.what_it_does ?? null,
    };
  });

  // A record tagged only "Rare earths (unspecified)" or "PGEs (unspecified)" answers to every member of the
  // family on the map's own filter. On a mineral's page and in the table it is counted apart, so that
  // an element shows only the projects that name it.
  const projectsByMineral = new Map();
  for (const p of projects) for (const m of p.tagged) if (!umbrellas.has(m)) (projectsByMineral.get(m) ?? projectsByMineral.set(m, []).get(m)).push(p);
  const sharedByMineral = new Map();
  for (const [umbrella, members] of umbrellas) {
    const list = projects.filter((p) => p.tagged.includes(umbrella));
    for (const m of members) sharedByMineral.set(m, { label: umbrella, family: mapMinerals.find((x) => x.name === m)?.family ?? null, ids: list.filter((p) => !p.tagged.includes(m)).map((p) => p.id) });
  }

  // ---- per-mineral core rows ---------------------------------------------------------------
  const minerals = scored.map((m) => {
    const name = m.mineral;
    const el = elementByMineral.get(name);
    if (!el) throw new Error(`No periodic-table element for ${name}`);
    const v = {};
    for (const [key, val] of Object.entries(m.vectors)) v[key] = val.composite ?? val.score;
    const s = SUBSCORES.map(([vec, sub]) => (sub ? m.vectors[vec].sub[sub] : m.vectors[vec].score));
    const mine = projectsByMineral.get(name) ?? [];
    const sites = mine.filter((p) => p.kind !== 'demand');
    const count = (list, key) => list.reduce((acc, p) => ((acc[p[key]] = (acc[p[key]] ?? 0) + 1), acc), {});
    const byStage = {};
    for (const p of sites) for (const st of p.stages) byStage[st] = (byStage[st] ?? 0) + 1;
    const c = capByName.get(name);
    return {
      name, symbol: el.symbol, z: el.z, row: el.row, col: el.col,
      group: groupOf[name],
      lists: ptLists[el.symbol] ?? 0,
      v, s,
      projects: { total: sites.length, demand: mine.length - sites.length, abroad: sites.filter((p) => p.abroad).length, byBand: count(sites, 'band'), byGroup: count(sites, 'group'), byStage, shared: sharedByMineral.get(name)?.ids.length ?? 0, family: sharedByMineral.get(name)?.family ?? null },
      capability: c ? {
        id: c.id, step: c.value_chain_step, nextMove: c.next_move, has: c.what_india_has, kinds: c.kinds,
        complexity: c.complexity, ease: c.ease, time: c.time_to_output, confidence: c.confidence,
        strategies: c.strategies, chemistry: c.chemistry, supplement: Boolean(c.supplement),
      } : null,
    };
  });

  const groups = criteria.groups.map((g) => ({
    id: g.id, name: g.name, sourceColor: g.color,
    tagline: groupText[g.id]?.tagline ?? null, body: groupText[g.id]?.body ?? null, policy: groupText[g.id]?.policy ?? [],
    members: minerals.filter((m) => m.group === g.id).map((m) => m.name),
  }));

  const vectors = criteria.vectors;
  // band tables per score: keyed by sub-score where a vector has two parts (the two supplier scores share one table)
  const bandKey = (vec, sub) => (vec === 'supplier_concentration' ? 'supplier_sub' : sub ?? vec);
  const subscores = SUBSCORES.map(([vec, sub], i) => {
    const vdef = criteria.vectors.find((x) => x.key === vec);
    const sdef = sub ? vdef.sub.find((x) => x.key === sub) : null;
    return { i, vector: vec, sub, name: sdef ? sdef.name : vdef.name, max: sdef ? sdef.max : vdef.max, family: vdef.family, note: sdef?.note ?? null, bands: completeBands[bandKey(vec, sub)] ?? null };
  });

  const core = {
    meta: {
      built: new Date().toISOString().slice(0, 19),
      sources: { dashboard: sourceInfo(DASH), map: sourceInfo(MAP), capability: sourceInfo(CAP) },
      mapBuilt: (await readJSON(path.join(mapData, 'meta.json'))).built,
      capabilityUpdated: cap.meta.updated,
      capabilityResearch: cap.meta.technology_research_date ?? null,
      counts: { minerals: minerals.length, projects: projects.length, strategies: cap.strategies.length, chemistry: cap.chemistry.length, capabilitySources: cap.sources.length, capabilityMinerals: cap.minerals.length },
    },
    groups, vectors, subscores, minerals,
    elements, ptSteps, ptLists, listsSeries, endUseSectors, endUseBreadth,
    matrix, dendrogram,
    stages, bands, stageBand, demandColor,
    mapMinerals: mapMinerals.map(({ name, symbol, family, umbrella, members, lists }) => ({ name, symbol, family, umbrella: Boolean(umbrella), members: members ?? null, lists })),
  };

  // ---- per-mineral detail files ------------------------------------------------------------
  const strategyById = new Map(cap.strategies.map((s) => [s.id, s]));
  const chemistryById = new Map(cap.chemistry.map((k) => [k.id, k]));
  const capSource = new Map(cap.sources.map((s) => [s.id, s]));
  let detailBytes = 0;
  for (const m of scored) {
    const c = capByName.get(m.mineral);
    const detail = {
      name: m.mineral,
      vectors: m.vectors,
      capability: c ? {
        ...c,
        strategyList: c.strategies.map((id) => strategyById.get(id)).filter(Boolean).map(({ id, number, slug, name, what, outside_china, complexity, cost, india_base, gap }) => ({ id, number, slug, name, what, outside_china, complexity, cost, india_base, gap })),
        chemistryList: c.chemistry.map((id) => chemistryById.get(id)).filter(Boolean).map((k) => ({
          id: k.id, slug: k.slug, name: k.name, who: k.who, carries_over_to: k.carries_over_to, fit: k.fit,
          summary: k.guide?.summary ?? null,
          links: [...(k.guide?.mineral_links ?? []).filter((l) => (l.minerals ?? []).includes(c.id)), ...(c.chemistry_how?.[k.id] ? [{ minerals: [c.id], how: c.chemistry_how[k.id] }] : [])],
        })),
        sourceList: (c.sources ?? []).map((id) => capSource.get(id)).filter(Boolean).map(({ id, title, url, type, published }) => ({ id, title, url, type, published: published ?? null })),
        estimates: (cap.meta.estimates ?? []).filter((x) => x.mineral === c.id),
      } : null,
      projects: (projectsByMineral.get(m.mineral) ?? []).map((p) => p.id),
      shared: sharedByMineral.get(m.mineral) ?? null,
    };
    detailBytes += await writeJSON(`minerals/${m.mineral}.json`, detail);
  }

  // ---- search index ------------------------------------------------------------------------
  const search = [
    ...minerals.map((m) => ({ t: 'mineral', id: m.name, n: m.name, x: m.symbol })),
    ...projects.map((p) => ({ t: 'project', id: p.id, n: p.name, x: [p.operator, p.state, p.country].filter(Boolean).join(' · ') })),
    ...cap.strategies.map((s) => ({ t: 'capability', id: s.slug, n: s.name, x: s.what })),
    ...cap.chemistry.map((k) => ({ t: 'technology', id: k.slug, n: k.name, x: k.carries_over_to })),
    ...groups.map((g) => ({ t: 'group', id: String(g.id), n: g.name, x: g.tagline ?? '' })),
    ...(await readJSON(path.join(mapData, 'schemes.json'))).filter((sc) => projects.some((p) => p.schemes.includes(sc.id))).map((sc) => ({ t: 'scheme', id: sc.id, n: sc.name, x: sc.ministry ?? '' })),
  ];

  // ---- write -------------------------------------------------------------------------------
  const sizes = {};
  sizes['core.json'] = await writeJSON('core.json', core);
  sizes['projects.json'] = await writeJSON('projects.json', projects);
  sizes['project-details.json'] = await writeJSON('project-details.json', Object.fromEntries(entities.map((e) => [e.id, e])));
  sizes['capability.json'] = await writeJSON('capability.json', cap);
  sizes['search.json'] = await writeJSON('search.json', search);
  for (const f of ['schemes.json', 'tranches.json', 'gsi.json', 'aggregates.json', 'coverage.json']) {
    sizes[f] = await writeJSON(f, await readJSON(path.join(mapData, f)));
  }
  await copyFile(path.join(mapData, 'blocks-polygons.geojson'), path.join(OUT, 'blocks-polygons.geojson'));
  const dl = path.join(MAP, 'public/downloads');
  if (existsSync(dl)) {
    await mkdir(path.join(OUT, 'downloads'), { recursive: true });
    for (const f of await readdir(dl)) await copyFile(path.join(dl, f), path.join(OUT, 'downloads', f));
  }
  await mkdir(path.join(OUT, 'geo'), { recursive: true });
  for (const f of await readdir(path.join(mapData, 'geo'))) await copyFile(path.join(mapData, 'geo', f), path.join(OUT, 'geo', f));

  const kb = (n) => (n / 1024).toFixed(0) + ' KB';
  console.log(`minerals ${minerals.length} · projects ${projects.length} · strategies ${cap.strategies.length} · guides ${cap.chemistry.length}`);
  console.log(Object.entries(sizes).map(([k, v]) => `${k} ${kb(v)}`).join(' · ') + ` · minerals/*.json ${kb(detailBytes)}`);
  console.log(`sources: dashboard ${core.meta.sources.dashboard.commit}, map ${core.meta.sources.map.commit}, capability ${core.meta.sources.capability.commit}`);
}

main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1); });
