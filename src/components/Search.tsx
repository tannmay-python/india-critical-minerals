// One search box for everything: minerals, projects, capabilities and technology guides.
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data/store";
import type { SearchItem } from "../data/types";
import { go, href } from "../lib/router";

const KIND: Record<SearchItem["t"], string> = { mineral: "Mineral", project: "Project", capability: "Capability", technology: "Technology", group: "Group", scheme: "Scheme" };
const target = (it: SearchItem): [string, Record<string, string>?] =>
  it.t === "mineral" ? [`/mineral/${encodeURIComponent(it.id)}`]
    : it.t === "project" ? ["/projects", { id: it.id }]
      : it.t === "capability" ? [`/capability/${it.id}`]
        : it.t === "group" ? [`/groups/${it.id}`]
          : it.t === "scheme" ? ["/projects", { scheme: it.id }]
            : [`/technology/${it.id}`];

export function Search() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const items = useData<SearchItem[]>(active || q ? "search.json" : null);
  const fuse = useMemo(() => (items ? new Fuse(items, { keys: [{ name: "n", weight: 3 }, { name: "x", weight: 1 }], threshold: 0.2, ignoreLocation: true, minMatchCharLength: 3 }) : null), [items]);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!items || !fuse || needle.length < 2) return [];
    const order = { mineral: 0, group: 1, capability: 2, technology: 3, scheme: 4, project: 5 } as const;
    const rank = (a: SearchItem, b: SearchItem) => order[a.t] - order[b.t] || a.n.localeCompare(b.n);
    // names that start with the query, then names or details that contain it, then near misses
    const starts = items.filter((it) => it.n.toLowerCase().startsWith(needle) || it.x.toLowerCase() === needle).sort(rank);
    const has = items.filter((it) => !starts.includes(it) && (it.n.toLowerCase().includes(needle) || it.x.toLowerCase().includes(needle))).sort(rank);
    const exact = [...starts, ...has];
    const fuzzy = exact.length >= 6 ? [] : fuse.search(needle, { limit: 12 }).map((r) => r.item).filter((it) => !exact.includes(it));
    return [...exact, ...fuzzy].slice(0, 12);
  }, [items, fuse, q]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const typing = (ev.target as HTMLElement).closest("input, select, textarea");
      if ((ev.key === "k" && (ev.metaKey || ev.ctrlKey)) || (ev.key === "/" && !typing)) { ev.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setCursor(0), [q]);

  const choose = (it: SearchItem) => { const [path, params] = target(it); setQ(""); input.current?.blur(); go(path, params); };

  return (
    <div className="search" role="search">
      <input ref={input} type="search" value={q} placeholder="Search" aria-label="Search minerals, projects and capabilities"
        aria-expanded={active && q.trim().length >= 2} aria-controls="search-results" autoComplete="off" spellCheck={false}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => setTimeout(() => setActive(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
          else if (e.key === "Enter" && results[cursor]) { e.preventDefault(); choose(results[cursor]); }
          else if (e.key === "Escape") { setQ(""); input.current?.blur(); }
        }} />
      {active && q.trim().length >= 2 && (
        <ul id="search-results" className="search-results" role="listbox">
          {results.length === 0 && <li className="sr-empty">{items ? "Nothing found." : "Loading…"}</li>}
          {results.map((it, i) => {
            const [path, params] = target(it);
            return (
              <li key={it.t + it.id} role="option" aria-selected={i === cursor}>
                <a href={href(path, params)} aria-selected={i === cursor} onMouseDown={(e) => { e.preventDefault(); choose(it); }} onMouseEnter={() => setCursor(i)}>
                  <span className="sr-kind">{KIND[it.t]}</span>
                  <span className="sr-name">{it.n}</span>
                  {it.x && it.t !== "mineral" && <span className="sr-meta">{it.x}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
