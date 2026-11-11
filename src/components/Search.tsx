// One search box for everything: minerals, projects, capabilities and technology guides.
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../data/store";
import type { SearchItem } from "../data/types";
import { go, href } from "../lib/router";

const KIND: Record<SearchItem["t"], string> = { mineral: "Mineral", project: "Project", capability: "Capability", technology: "Technology" };
const target = (it: SearchItem): [string, Record<string, string>?] =>
  it.t === "mineral" ? [`/mineral/${encodeURIComponent(it.id)}`]
    : it.t === "project" ? ["/projects", { id: it.id }]
      : it.t === "capability" ? [`/capability/${it.id}`]
        : [`/technology/${it.id}`];

export function Search() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const items = useData<SearchItem[]>(active || q ? "search.json" : null);
  const fuse = useMemo(() => (items ? new Fuse(items, { keys: [{ name: "n", weight: 3 }, { name: "x", weight: 1 }], threshold: 0.34, ignoreLocation: true, minMatchCharLength: 2 }) : null), [items]);
  const results = useMemo(() => {
    if (!fuse || q.trim().length < 2) return [];
    const order = { mineral: 0, capability: 1, technology: 2, project: 3 } as const;
    return fuse.search(q.trim(), { limit: 24 })
      .sort((a, b) => (a.score! - b.score! > 0.08 || b.score! - a.score! > 0.08 ? a.score! - b.score! : order[a.item.t] - order[b.item.t]))
      .slice(0, 12).map((r) => r.item);
  }, [fuse, q]);

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
