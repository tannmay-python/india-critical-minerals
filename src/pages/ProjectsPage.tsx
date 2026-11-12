// Projects: every record as one mark, on the map or arranged along the chain, through time or by
// auction tranche. Filter state rides in the query, in the same form the project map used, so old
// links keep working.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useCore, useData } from "../data/store";
import type { Entity, Project, StatusGroup } from "../data/types";
import { Mark, STATUS_LABEL, STATUS_LABEL_ABROAD } from "../components/ProjectMark";
import { ProjectDrawer } from "../components/ProjectDrawer";
import { BAND_COLOR } from "../lib/colors";
import { fmtDate } from "../lib/format";
import { href, replaceQuery, useRoute } from "../lib/router";
import { createMap, type MapView } from "../projects/mapview";
import { AuctionBoard, ChainBoard, TimeBoard } from "../projects/Boards";
import "./ProjectsPage.css";

type Show = "map" | "chain" | "time" | "auctions";
const SHOWS: { id: Show; label: string }[] = [
  { id: "map", label: "Map" }, { id: "chain", label: "Chain" }, { id: "time", label: "Time" }, { id: "auctions", label: "Auctions" },
];
const GROUPS: StatusGroup[] = ["active", "pipeline", "inactive"];

interface Filters {
  abroad: boolean; stages: Set<string>; groups: Set<StatusGroup>; mineral: string; state: string; scheme: string;
  demand: boolean; unconfirmed: boolean; from: number | null; to: number | null;
}
type Skip = "stages" | "groups" | "mineral" | "state" | "scheme" | "years";

const regionOf = (p: Project) => (p.abroad ? p.country ?? "" : p.state ?? p.country ?? "");

export function ProjectsPage() {
  const core = useCore();
  const { params } = useRoute();
  const all = useData<Project[]>("projects.json");
  const schemes = useData<{ id: string; name: string }[]>("schemes.json");
  const selected = params.get("id");
  const details = useData<Record<string, Entity>>(selected ? "project-details.json" : null);
  const [fly, setFly] = useState(true);

  // ---- state from the URL ----------------------------------------------------------------------
  const f = useMemo<Filters>(() => {
    const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
    const year = (k: string) => { const n = Number(params.get(k)); return Number.isInteger(n) && n >= 1800 && n <= 2100 ? n : null; };
    const groups = new Set(list("status").filter((g): g is StatusGroup => GROUPS.includes(g as StatusGroup)));
    return {
      abroad: params.get("view") === "abroad", stages: new Set(list("stage")), groups: groups.size ? groups : new Set(GROUPS),
      mineral: params.get("mineral") ?? "", state: params.get("state") ?? "", scheme: params.get("scheme") ?? "",
      demand: params.get("demand") === "1", unconfirmed: params.get("unconfirmed") === "1", from: year("from"), to: year("to"),
    };
  }, [params]);
  const show: Show = f.abroad ? "map" : (SHOWS.find((s) => s.id === params.get("show"))?.id ?? "map");

  const set = (patch: Record<string, string | number | boolean | null | string[]>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const s = Array.isArray(v) ? v.join(",") : v === true ? "1" : v === false || v === null ? "" : String(v);
      s ? q.set(k, s) : q.delete(k);
    }
    replaceQuery(q);
  };
  const reset = () => set({ stage: null, status: null, mineral: null, state: null, scheme: null, from: null, to: null });

  // ---- which records pass ----------------------------------------------------------------------
  const family = useMemo(() => new Map(core.mapMinerals.map((m) => [m.name, m.family])), [core]);
  const mineralMatch = (p: Project, m: string) => {
    if (!m) return true;
    if (m.startsWith("family:")) return p.minerals.some((x) => family.get(x) === m.slice(7));
    return p.minerals.includes(m);
  };
  const confirmed = (p: Project) => f.unconfirmed || p.confidence !== "low";
  const inView = (p: Project) => p.abroad === f.abroad && (f.demand || p.kind !== "demand");
  const inYears = (p: Project) => (f.from === null && f.to === null) || (p.year !== null && (f.from === null || p.year >= f.from) && (f.to === null || p.year <= f.to));
  const pass = (p: Project, skip?: Skip) =>
    inView(p) && confirmed(p) &&
    (skip === "stages" || !f.stages.size || p.kind === "demand" || f.stages.has(p.stage)) &&
    (skip === "groups" || f.groups.has(p.group)) &&
    (skip === "mineral" || mineralMatch(p, f.mineral)) &&
    (skip === "state" || !f.state || regionOf(p) === f.state) &&
    (skip === "scheme" || !f.scheme || p.schemes.includes(f.scheme)) &&
    (skip === "years" || inYears(p));

  const shown = useMemo(() => (all ?? []).filter((p) => pass(p)), [all, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = useMemo(() => (all ?? []).filter((p) => inView(p) && confirmed(p)), [all, f.abroad, f.demand, f.unconfirmed]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (skip: Skip, test: (p: Project) => boolean) => (all ?? []).filter((p) => pass(p, skip) && test(p)).length;
  const filtered = f.stages.size > 0 || f.groups.size !== GROUPS.length || f.mineral || f.state || f.scheme || f.from !== null || f.to !== null;

  const names = useMemo(() => new Map((all ?? []).map((p) => [p.id, p.name])), [all]);
  const light = selected ? all?.find((p) => p.id === selected) : undefined;
  const entity = selected ? details?.[selected] : undefined;

  // A linked record decides the view and clears any filter that would hide it.
  useEffect(() => {
    if (!light) return;
    const patch: Record<string, string | null> = {};
    if (light.abroad !== f.abroad) { patch.view = light.abroad ? "abroad" : null; patch.state = null; patch.stage = null; patch.show = null; }
    if (light.kind !== "block" && show === "auctions") patch.show = null;
    if (light.kind === "demand" && !f.demand) patch.demand = "1";
    if (light.confidence === "low" && !f.unconfirmed) patch.unconfirmed = "1";
    if (!Object.keys(patch).length && !pass(light)) Object.assign(patch, { stage: null, status: null, mineral: null, state: null, scheme: null, from: null, to: null });
    if (Object.keys(patch).length) set(patch);
  }, [light?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string | null, flyTo = false) => { setFly(flyTo); set({ id }); };
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape" && selected) pick(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- panel contents --------------------------------------------------------------------------
  const stagesPresent = core.stages.filter((s) => s.id !== "Cells & Devices" && base.some((p) => p.kind !== "demand" && p.stage === s.id));
  const stageLabel = (id: string) => (id === "R&D" ? "Research" : id);
  const mineralNames = [...new Set(base.flatMap((p) => p.minerals))].sort();
  const families = (["REE", "PGE"] as const).filter((fam) => base.some((p) => mineralMatch(p, `family:${fam}`)));
  const regions = [...new Set(base.map(regionOf).filter(Boolean))].sort();
  const schemeIds = [...new Set(base.flatMap((p) => p.schemes))];
  const schemeName = (id: string) => schemes?.find((s) => s.id === id)?.name ?? id;
  const years = [...new Set([...base.map((p) => p.year), f.from, f.to].filter((y): y is number => y !== null))].sort((a, b) => a - b);
  const nAbroad = (all ?? []).filter((p) => p.abroad && confirmed(p) && p.kind !== "demand" && mineralMatch(p, f.mineral)).length;
  const nDemand = (all ?? []).filter((p) => p.kind === "demand" && confirmed(p)).length;
  const hasLow = (all ?? []).some((p) => p.confidence === "low");
  const labels = f.abroad ? STATUS_LABEL_ABROAD : STATUS_LABEL;
  const opt = (v: string, label: string, n: number, cur: string) => <option key={v} value={v} disabled={n === 0 && v !== cur}>{label}{n ? ` (${n})` : ""}</option>;
  const [panelOpen, setPanelOpen] = useState(false);
  const blocks = shown.filter((p) => p.kind === "block").length;

  return (
    <main className={`projects show-${show}${entity ? " has-drawer" : ""}`}>
      <aside className={`panel${panelOpen ? " open" : ""}`} aria-label="Filters">
        {f.abroad && <a className="back-link" href={href("/projects", { mineral: f.mineral })}>India</a>}
        <div className="panel-head">
          <p className="count"><strong>{show === "auctions" ? blocks : shown.length}</strong>{filtered && show !== "auctions" ? ` of ${base.length}` : ""} {f.abroad ? "projects abroad" : show === "auctions" ? "auction blocks" : "projects"}</p>
          {filtered && <button type="button" className="link" onClick={reset}>Reset</button>}
        </div>

        {!f.abroad && (
          <div className="pills show-pills" role="group" aria-label="Arrangement">
            {SHOWS.map((s) => <button key={s.id} type="button" className="pill" aria-pressed={s.id === show} onClick={() => set({ show: s.id === "map" ? null : s.id })}>{s.label}</button>)}
          </div>
        )}

        {f.abroad ? (
          <ul className="band-key">
            {core.bands.filter((b) => shown.some((p) => p.band === b.id)).map((b) => <li key={b.id}><i className="swatch" style={{ "--c": b.color } as CSSProperties} />{b.label}</li>)}
          </ul>
        ) : show === "auctions" ? null : (
          <div className="bands" role="group" aria-label="Stage">
            {core.bands.map((b) => {
              const chips = stagesPresent.filter((s) => core.stageBand[s.id] === b.id);
              if (!chips.length) return null;
              return (
                <div className="band-row" key={b.id} title={b.label}>
                  <i className="swatch" style={{ "--c": b.color } as CSSProperties} />
                  <div className="stage-chips">
                    {chips.map((s) => {
                      const on = f.stages.has(s.id);
                      const n = count("stages", (p) => p.kind !== "demand" && p.stage === s.id);
                      return (
                        <button key={s.id} type="button" className={`stage-chip${on ? " on" : ""}`} aria-pressed={on}
                          onClick={() => { const next = new Set(f.stages); on ? next.delete(s.id) : next.add(s.id); set({ stage: [...next] }); }}>
                          {stageLabel(s.id)}<span className="num">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="checks" role="group" aria-label="Status">
          {GROUPS.map((g) => (
            <label className="check" key={g}>
              <input type="checkbox" checked={f.groups.has(g)} onChange={(ev) => { const next = new Set(f.groups); ev.target.checked ? next.add(g) : next.delete(g); set({ status: next.size === GROUPS.length ? null : [...next] }); }} />
              <Mark kind="site" band="demand" group={g} size={12} />{labels[g]}<span className="num">{count("groups", (p) => p.group === g)}</span>
            </label>
          ))}
          {!f.abroad && (
            <p className="shape-key">
              <span><Mark kind="site" band="demand" group="active" size={11} />Project or site</span>
              <span><Mark kind="block" band="demand" group="active" size={11} />Auction block</span>
              {f.demand && <span><Mark kind="demand" band="demand" group="active" size={11} />Cell plant or fab</span>}
            </p>
          )}
        </div>

        {(
          <div className="selects">
            <select aria-label="Mineral" value={f.mineral} onChange={(ev) => set({ mineral: ev.target.value })}>
              <option value="">All minerals</option>
              {families.map((fam) => opt(`family:${fam}`, fam === "REE" ? "Rare earths, all" : "Platinum group, all", count("mineral", (p) => mineralMatch(p, `family:${fam}`)), f.mineral))}
              {mineralNames.map((m) => opt(m, m, count("mineral", (p) => p.minerals.includes(m)), f.mineral))}
            </select>
            {f.mineral && core.mineral.has(f.mineral) && <a className="mineral-link" href={href(`/mineral/${encodeURIComponent(f.mineral)}`)}>{f.mineral}: scores and value chain</a>}
            <select aria-label={f.abroad ? "Country" : "State"} value={f.state} onChange={(ev) => set({ state: ev.target.value })}>
              <option value="">{f.abroad ? "All countries" : "All states"}</option>
              {regions.map((r) => opt(r, r, count("state", (p) => regionOf(p) === r), f.state))}
            </select>
            {schemeIds.length > 0 && (
              <select aria-label="Scheme" value={f.scheme} onChange={(ev) => set({ scheme: ev.target.value })}>
                <option value="">All schemes</option>
                {schemeIds.map((id) => [id, schemeName(id)] as const).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => opt(id, name, count("scheme", (p) => p.schemes.includes(id)), f.scheme))}
              </select>
            )}
          </div>
        )}

        <div className="years" title="The year a record first became public: announced, first put to auction, or opened">
          <span>First public</span>
          <select aria-label="From year" value={f.from ?? ""} onChange={(ev) => setYears(ev.target.value ? Number(ev.target.value) : null, f.to)}>
            <option value="">Earliest</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span aria-hidden="true">to</span>
          <select aria-label="To year" value={f.to ?? ""} onChange={(ev) => setYears(f.from, ev.target.value ? Number(ev.target.value) : null)}>
            <option value="">Latest</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {!f.abroad && (
          <div className="checks">
            <label className="check"><input type="checkbox" checked={f.demand} onChange={(ev) => set({ demand: ev.target.checked })} />Cell plants and gallium fabs<span className="num">{nDemand}</span></label>
            {hasLow && <label className="check"><input type="checkbox" checked={f.unconfirmed} onChange={(ev) => set({ unconfirmed: ev.target.checked })} />Unconfirmed</label>}
          </div>
        )}

        {f.abroad ? (
          <div className="abroad-list">
            {[...groupBy(shown, regionOf)].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).map(([country, list]) => (
              <section key={country}>
                <h3>{country}</h3>
                <ul>
                  {list.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name)).map((p) => (
                    <li key={p.id}>
                      <button type="button" aria-current={p.id === selected ? "true" : undefined} onClick={() => pick(p.id, true)}>
                        <Mark kind={p.kind} band={p.band} group={p.group} size={11} />
                        <span>{p.name}<small>{p.status}{p.operator ? ` · ${p.operator.replace(/ \(.*\)$/, "")}` : ""}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <a className="abroad-link" href={href("/projects", { view: "abroad", mineral: f.mineral })}>Indian projects abroad<span className="num">{nAbroad}</span></a>
        )}
        <p className="panel-foot">Updated {fmtDate(core.meta.sources.map.date)} · <a href={href("/method")}>Method and data</a></p>
      </aside>
      <button type="button" className="panel-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>Filters<span className="num">{shown.length}</span></button>

      <div className="stage-area">
        {!f.abroad && (
          <div className="pills show-pills on-stage" role="group" aria-label="Arrangement">
            {SHOWS.map((s) => <button key={s.id} type="button" className="pill" aria-pressed={s.id === show} onClick={() => set({ show: s.id === "map" ? null : s.id })}>{s.label}</button>)}
          </div>
        )}
        {show === "map" && all && <MapCanvas projects={shown} selected={selected} fly={fly} abroad={f.abroad} onPick={(id) => pick(id)} drawerOpen={Boolean(entity)} />}
        {show === "chain" && <ChainBoard projects={shown} selected={selected} onPick={(id) => pick(id)} />}
        {show === "time" && <TimeBoard projects={shown} selected={selected} onPick={(id) => pick(id)} />}
        {show === "auctions" && <AuctionBoard projects={shown} selected={selected} onPick={(id) => pick(id)} />}
        {show === "map" && (
          <ul className="map-key" aria-hidden="true">
            {core.bands.filter((b) => shown.some((p) => p.band === b.id)).map((b) => <li key={b.id}><i className="swatch" style={{ "--c": BAND_COLOR[b.id] } as CSSProperties} />{b.short}</li>)}
          </ul>
        )}
      </div>

      {entity && light && <ProjectDrawer e={entity} light={light} names={names} onClose={() => pick(null)} onOpen={(id) => pick(id, true)} />}
    </main>
  );

  function setYears(from: number | null, to: number | null) {
    if (from !== null && to !== null && from > to) [from, to] = [to, from];
    set({ from, to });
  }
}

function groupBy<T>(list: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const t of list) (out.get(key(t)) ?? out.set(key(t), []).get(key(t))!).push(t);
  return out;
}

function MapCanvas({ projects, selected, fly, abroad, onPick, drawerOpen }: {
  projects: Project[]; selected: string | null; fly: boolean; abroad: boolean; onPick(id: string | null): void; drawerOpen: boolean;
}) {
  const core = useCore();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MapView | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const drawerRef = useRef(drawerOpen);
  drawerRef.current = drawerOpen;

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 760px)");
    const padding = () => ({
      top: 40, bottom: mobile.matches ? (drawerRef.current ? window.innerHeight * 0.5 : 60) : 40,
      left: mobile.matches ? 20 : 40, right: mobile.matches ? 20 : drawerRef.current ? 470 : 40,
    });
    const m = createMap(el.current!, (id) => pickRef.current(id), padding, abroad ? "abroad" : "india", core.bands);
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current!);
    return () => { ro.disconnect(); m.destroy(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { map.current?.setEntities(projects); }, [projects]);
  useEffect(() => { map.current?.select(selected, fly); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { map.current?.setView(abroad ? "abroad" : "india"); }, [abroad]);
  return <div ref={el} className="map-canvas" aria-label="Map of projects" />;
}
