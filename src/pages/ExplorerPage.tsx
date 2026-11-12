// Every mineral as a card carrying the shape of its ten scores. Filter by group, sort by any
// score, search by name; a card opens the mineral's page.
import type { CSSProperties } from "react";
import { useCore } from "../data/store";
import type { VectorKey } from "../data/types";
import { Radar } from "../components/Radar";
import { groupColor, inkOn } from "../lib/colors";
import { mineralHref, replaceQuery, useRoute } from "../lib/router";
import "./ExplorerPage.css";

export function ExplorerPage() {
  const core = useCore();
  const route = useRoute();
  const q = route.params.get("q") ?? "";
  const groupId = route.params.get("group");
  const sortKey = route.params.get("sort") ?? "";
  const sortBy = core.vectors.find((v) => v.key === sortKey);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(route.params);
    if (value) next.set(key, value); else next.delete(key);
    replaceQuery(next);
  };

  const needle = q.trim().toLowerCase();
  const list = core.minerals
    .filter((m) => (groupId === null || String(m.group) === groupId) && (!needle || m.name.toLowerCase().includes(needle) || m.symbol.toLowerCase() === needle))
    .sort((a, b) => (sortBy ? b.v[sortBy.key as VectorKey] / sortBy.max - a.v[sortBy.key as VectorKey] / sortBy.max : 0) || a.name.localeCompare(b.name));

  return (
    <main className="wrap explorer">
      <h1>All {core.minerals.length} minerals</h1>
      <div className="ex-bar">
        <input type="search" value={q} placeholder="Search" aria-label="Search minerals by name" autoComplete="off" spellCheck={false} onChange={(e) => set("q", e.target.value)} />
        <label className="score-pick">
          <span className="sr-only">Sort by</span>
          <select value={sortKey} onChange={(e) => set("sort", e.target.value)}>
            <option value="">A to Z</option>
            {core.vectors.map((v) => <option key={v.key} value={v.key}>{v.name}, highest first</option>)}
          </select>
        </label>
        <div className="pills" role="group" aria-label="Group">
          <button type="button" className="pill" aria-pressed={groupId === null} onClick={() => set("group", "")}>All</button>
          {core.groups.map((g) => (
            <button type="button" key={g.id} className="pill" aria-pressed={groupId === String(g.id)} onClick={() => set("group", groupId === String(g.id) ? "" : String(g.id))}>
              <i className="swatch" style={{ "--c": groupColor(g.id) } as CSSProperties} />{g.name}
            </button>
          ))}
        </div>
      </div>

      <ul className="ex-grid">
        {list.map((m) => {
          const color = groupColor(m.group);
          const group = core.group.get(m.group);
          return (
            <li key={m.name}>
              <a href={mineralHref(m.name)}>
                <span className="ex-top">
                  <span className="ex-tile" style={{ background: color, color: inkOn(color) }}>{m.symbol}</span>
                  <b>{m.name}</b>
                  {sortBy && <span className="ex-score num">{m.v[sortBy.key as VectorKey]}<small>/{sortBy.max}</small></span>}
                </span>
                <Radar vectors={core.vectors} labels={false} size={132} series={[{ label: m.name, color, values: core.vectors.map((v) => m.v[v.key] / v.max), fill: true }]} />
                <span className="ex-group">{group?.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="muted">No mineral matches.</p>}
    </main>
  );
}
