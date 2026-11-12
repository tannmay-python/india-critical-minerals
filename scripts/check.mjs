#!/usr/bin/env node
/*
 * One command that fails loudly when the site drifts from its three sources or from the owner's
 * rules on text. Run after `npm run data`:   npm run check
 *
 *   1. Data parity   the built data agrees with the source repositories, count for count.
 *   2. Prose parity  every paragraph in src/content/ still appears, word for word, in its source.
 *   3. Copy lint     no banned words, no eyebrow labels, no decorative uppercase micro-labels.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.resolve(ROOT, '..', 'sources');
const DASH = path.join(SRC, 'crit-minerals-dashboard');
const MAP = path.join(SRC, 'india-critical-minerals-map');
const CAP = path.join(SRC, 'india-capability-map');
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const problems = [];
const ok = [];
const check = (name, pass, detail = '') => (pass ? ok.push(name) : problems.push(`${name}${detail ? `: ${detail}` : ''}`));

// ---------------------------------------------------------------------------------------- data
async function dataParity() {
  const core = await json(path.join(ROOT, 'public/data/core.json'));
  const projects = await json(path.join(ROOT, 'public/data/projects.json'));
  const details = await json(path.join(ROOT, 'public/data/project-details.json'));
  const cap = await json(path.join(ROOT, 'public/data/capability.json'));
  const scored = (await json(path.join(DASH, 'data/minerals_data.json'))).minerals;
  const groups = await json(path.join(DASH, 'data/group_assignments.json'));
  const entities = await json(path.join(MAP, 'public/data/entities.json'));
  const capSrc = await json(path.join(CAP, 'capability_map.json'));

  check('51 minerals, same names as the dashboard', core.minerals.length === scored.length && scored.every((m) => core.minerals.some((x) => x.name === m.mineral)));
  check('every group assignment carried over', core.minerals.every((m) => groups[m.name] === m.group));
  let scoreDiffs = 0, compositeDiffs = 0;
  for (const m of scored) {
    const built = core.minerals.find((x) => x.name === m.mineral);
    const detail = await json(path.join(ROOT, 'public/data/minerals', `${m.mineral}.json`));
    for (const [k, v] of Object.entries(m.vectors)) {
      if ((v.composite ?? v.score) !== built.v[k]) scoreDiffs++;
      if (detail.vectors[k].reason !== v.reason) scoreDiffs++;
      if (v.sub && Math.abs(Object.values(v.sub).reduce((a, b) => a + b, 0) - v.composite) > 1e-9) compositeDiffs++;
    }
    for (const s of core.subscores) {
      const v = m.vectors[s.vector];
      if ((s.sub ? v.sub[s.sub] : v.score) !== built.s[s.i]) scoreDiffs++;
    }
  }
  check('all 510 scores, 765 sub-scores and reasons identical to the dashboard', scoreDiffs === 0, `${scoreDiffs} differences`);
  check('every composite is the sum of its sub-scores (source data)', compositeDiffs === 0, `${compositeDiffs} composites`);

  // the dashboard's group matrix can be recomputed from the scores
  const rowOf = [['demand'], ['growth'], ['supplier_concentration', 'mining_diversity'], ['supplier_concentration', 'refining_diversity'], ['reserves', 'timeframe'], ['reserves', 'diversification'], ['end_use'], ['substitutability_recyclability', 'substitutability'], ['substitutability_recyclability', 'recyclability'], ['extraction_refining'], ['upcoming_projects'], ['india_position', 'import_dependence'], ['india_position', 'strategic_posture'], ['price_volatility']];
  let matrixDiffs = 0;
  core.matrix.rows.forEach((row, i) => {
    for (const cell of row.cells) {
      const members = scored.filter((m) => groups[m.mineral] === cell.g);
      const [vec, sub] = rowOf[i];
      const mean = members.reduce((a, m) => a + (sub ? m.vectors[vec].sub[sub] : m.vectors[vec].composite ?? m.vectors[vec].score), 0) / members.length;
      if (Math.abs(Math.round(mean * 100) / 100 - cell.v) > 0.011) matrixDiffs++;
    }
  });
  check('group matrix matches a fresh recomputation from the scores', matrixDiffs === 0, `${matrixDiffs} cells`);
  check('clustering tree has 51 leaves and 50 joins', core.dendrogram.leaves.length === 51 && core.dendrogram.merges.length === 50);
  check('tree leaf groups match the group assignments', core.dendrogram.leaves.every((l) => groups[l.name] === l.group));

  check(`${entities.length} project records, none lost`, projects.length === entities.length && Object.keys(details).length === entities.length);
  check('project ids unique', new Set(projects.map((p) => p.id)).size === projects.length);
  check('project status, group and coordinates identical to the map', entities.every((e) => { const p = projects.find((x) => x.id === e.id); return p && p.status === e.status && p.group === e.status_group && p.lat === e.lat && p.lon === e.lon; }));
  const names = new Set(core.minerals.map((m) => m.name));
  check('every mineral a project answers to is one of the 51', projects.every((p) => p.minerals.every((m) => names.has(m))));
  const perMineral = (name) => projects.filter((p) => p.tagged.includes(name) && p.kind !== 'demand').length;
  check('per-mineral project counts agree with the project list (records that name the mineral)', core.minerals.every((m) => m.projects.total === perMineral(m.name)));
  check('every mineral tag on a project is one of the 51 or a family tag (14 records carry no mineral tag)', projects.every((p) => p.tagged.every((t) => names.has(t) || /unspecified/.test(t))));
  const tr = await json(path.join(ROOT, 'public/data/tranches.json'));
  const offers = (id, outcome) => projects.reduce((n, p) => n + p.tranches.filter((t) => t.t === id && (!outcome || t.o === outcome)).length, 0);
  const trBad = tr.filter((t) => offers(t.id) !== t.offered || offers(t.id, 'Preferred bidder') !== t.auctioned);
  check('auction board counts equal the tranche table (offered and auctioned)', trBad.length === 0, trBad.map((t) => `${t.id} board ${offers(t.id, 'Preferred bidder')}/${offers(t.id)} table ${t.auctioned}/${t.offered}`).join('; '));

  check('26 capability minerals, 18 strategies, 10 guides', cap.minerals.length === capSrc.minerals.length && cap.strategies.length === capSrc.strategies.length && cap.chemistry.length === capSrc.chemistry.length && cap.chemistry.every((k) => k.guide));
  check('capability text identical to the workbook export', capSrc.minerals.every((m) => { const b = cap.minerals.find((x) => x.id === m.id); return b && b.next_move === m.next_move && b.what_india_has === m.what_india_has && JSON.stringify(b.stages) === JSON.stringify(m.stages); }));
  check('capability groups agree with the dashboard', cap.minerals.every((m) => groups[m.name] === m.group));
}

// --------------------------------------------------------------------------------------- prose
const squash = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\\n/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\\(['"`])/g, '$1').replace(/\s+/g, ' ').trim();
async function proseParity() {
  const sources = {
    'home.ts': [path.join(DASH, 'index.html')],
    'groups.ts': [path.join(DASH, 'index.html'), path.join(DASH, 'app.js'), path.join(DASH, 'dendrogram.html'), path.join(DASH, 'group-profiles.html')],
    'projects.ts': [path.join(MAP, 'src/ui/about.ts')],
  };
  for (const [file, srcs] of Object.entries(sources)) {
    const text = await readFile(path.join(ROOT, 'src/content', file), 'utf8');
    const hay = squash((await Promise.all(srcs.map((s) => readFile(s, 'utf8')))).join('\n'));
    // every string of real prose (40+ characters) in the content file
    const strings = [...text.matchAll(/(["`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]).filter((s) => s.length >= 40 && !s.startsWith('http') && !/^[.\/]/.test(s));
    const missing = strings.map(squash).filter((s) => !hay.includes(s));
    check(`src/content/${file}: ${strings.length} passages match their source word for word`, missing.length === 0, missing.map((s) => `"${s.slice(0, 70)}..."`).join(' | '));
  }
}

// ---------------------------------------------------------------------------------------- copy
const BANNED = ['pivotal', 'landmark', 'game-changer', 'robust', 'cutting-edge', 'poised to', 'testament to', 'it is worth noting', 'essentially', 'simply put', 'in other words', 'delve', 'leverage the power', 'seamless', 'unlock'];
// 2b. Journeys: one per mineral, well formed.
{
  const core = await json(path.join(ROOT, 'public/data/core.json'));
  const names = new Set(core.minerals.map((m) => m.name));
  const dir = path.join(ROOT, 'src/journeys');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const bands = new Set(['upstream', 'process', 'make', 'recycle', 'research', 'demand']);
  const bad = [];
  for (const f of files) {
    const j = await json(path.join(dir, f));
    if (j.mineral + '.json' !== f || !names.has(j.mineral)) bad.push(`${f}: not a mineral on the site`);
    if (!j.sources?.length) bad.push(`${f}: no sources`);
    const ids = new Set();
    for (const s of j.steps ?? []) {
      if (!s.id || ids.has(s.id) || !s.title || !s.text || !bands.has(s.band)) bad.push(`${f}: step ${s.id} is incomplete`);
      ids.add(s.id);
      if (s.form && !(s.form.content >= 0 && s.form.content <= 100)) bad.push(`${f}: ${s.id} content out of range`);
      if (s.shares && s.shares.rows.reduce((t, r) => t + r[1], 0) > 101) bad.push(`${f}: ${s.id} shares add up to more than 100`);
      if (/\u2014/.test(JSON.stringify(s))) bad.push(`${f}: ${s.id} has an em dash`);
      if (s.text.split(/\s+/).length > 75) bad.push(`${f}: ${s.id} text is over 75 words`);
    }
    if ((j.steps ?? []).length < 4) bad.push(`${f}: fewer than four steps`);
  }
  const missing = [...names].filter((n) => !files.includes(n + '.json'));
  check(`journeys: ${files.length} files, every mineral has one, all well formed`, bad.length === 0 && missing.length === 0, [...bad, ...missing.map((n) => `no journey for ${n}`)].join(' | '));
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
async function copyLint() {
  const files = (await walk(path.join(ROOT, 'src'))).filter((f) => /\.(tsx?|css)$/.test(f));
  const hits = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const text = await readFile(f, 'utf8');
    const isContent = rel.startsWith('src/content/');
    if (/\.tsx$/.test(f)) {
      // visible strings: JSX text and string literals passed as children or labels
      const visible = [...text.matchAll(/>([^<>{}]{3,})</g)].map((m) => m[1]).concat([...text.matchAll(/(?:label|title|placeholder|aria-label)[:=]\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]));
      for (const v of visible) {
        const low = v.toLowerCase();
        for (const b of BANNED) if (low.includes(b)) hits.push(`${rel}: banned phrase "${b}" in "${v.trim().slice(0, 60)}"`);
        if (v.includes('—')) hits.push(`${rel}: em dash in interface text "${v.trim().slice(0, 60)}"`);
        if (/!\s*$/.test(v.trim())) hits.push(`${rel}: exclamation in "${v.trim().slice(0, 60)}"`);
      }
      if (/className="[^"]*\b(eyebrow|kicker|overline|supertitle)\b/.test(text)) hits.push(`${rel}: an eyebrow or kicker label (class name)`);
    }
    if (/\.css$/.test(f)) {
      // uppercase micro-labels are allowed only for the two functional tags below
      for (const m of text.matchAll(/([^{}]+)\{[^}]*text-transform:\s*uppercase[^}]*\}/g)) {
        const sel = m[1].trim();
        if (!/\.tier\b|\.sr-kind\b/.test(sel)) hits.push(`${rel}: uppercase label style on "${sel.slice(0, 60)}"`);
      }
    }
    if (!isContent && /\.tsx$/.test(f) && (text.match(/<h[1-6]/g) ?? []).length > 14) hits.push(`${rel}: more than 14 headings in one page component`);
  }
  check('copy lint: no banned phrases, eyebrows, em dashes or decorative uppercase labels', hits.length === 0, '\n   ' + hits.join('\n   '));
}

await dataParity();
await proseParity();
await copyLint();
for (const line of ok) console.log(`ok   ${line}`);
for (const line of problems) console.log(`FAIL ${line}`);
console.log(problems.length ? `\n${problems.length} check(s) failed` : `\nall ${ok.length} checks passed`);
process.exit(problems.length ? 1 : 0);
