// Hash routing: every view is linkable and the built site works on static hosting.
//
//   #/                         minerals (home)
//   #/mineral/<Name>           one mineral
//   #/compare?m=A,B,C          side by side
//   #/groups                   the six groups        #/groups/<id>
//   #/projects                 projects (map and other arrangements); state rides in the query
//   #/project/<id>             one project's full record
//   #/capabilities             capabilities          #/capability/<slug>   #/technology/<slug>
//   #/method                   method, sources, credits
//
// Links published by the three earlier sites keep working: see LEGACY below.
import { useSyncExternalStore } from "react";

export interface Route {
  path: string[];
  params: URLSearchParams;
  /** Everything after "#", normalised. */
  raw: string;
}

/** Rewrites of the hash formats used by the three source sites. */
function legacy(raw: string): string {
  // dashboard: #overview #explorer #methodology #groups #mineral/<Name>
  if (raw === "overview" || raw === "explorer" || raw === "") return "/";
  if (raw === "methodology") return "/method";
  if (raw === "groups") return "/groups";
  if (raw.startsWith("mineral/")) return "/" + raw;
  // project map: #/e/<id> #/p/<id> #/about #/?stage=...&id=...
  let m = /^\/e\/([^?]+)/.exec(raw);
  if (m) return `/projects?id=${m[1]}`;
  if ((m = /^\/p\/([^?]+)/.exec(raw))) return `/project/${m[1]}`;
  if (raw === "/about") return "/method";
  if (/^\/\?(.*\b(stage|status|state|scheme|view|id|from|to|demand|unconfirmed)=)/.test(raw)) return "/projects" + raw.slice(1);
  // capability map: #/strategies #/strategy/<slug> #/existing-capabilities #/chemistry/<slug> #/sources
  if (raw === "/strategies" || raw === "/existing-capabilities") return "/capabilities";
  if ((m = /^\/strategy\/(.+)/.exec(raw))) return `/capability/${m[1]}`;
  if ((m = /^\/chemistry\/(.+)/.exec(raw))) return `/technology/${m[1]}`;
  if (raw === "/sources") return "/method";
  return raw;
}

export function parse(hash: string): Route {
  let raw = hash.replace(/^#/, "");
  const fixed = legacy(raw);
  if (fixed !== raw) {
    raw = fixed;
    history.replaceState(null, "", "#" + raw);
  }
  const [p, q = ""] = raw.split("?");
  return { path: p.split("/").filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(q), raw };
}

let current = parse(location.hash);
const listeners = new Set<() => void>();
window.addEventListener("hashchange", () => {
  current = parse(location.hash);
  listeners.forEach((fn) => fn());
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => current,
  );
}

export function href(path: string, params?: Record<string, string | number | null | undefined> | URLSearchParams): string {
  const q = params instanceof URLSearchParams ? params : new URLSearchParams();
  if (params && !(params instanceof URLSearchParams)) {
    for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString().replace(/%2C/g, ",");
  return "#" + path + (s ? "?" + s : "");
}

export function go(path: string, params?: Parameters<typeof href>[1]): void {
  location.hash = href(path, params).slice(1);
}

/** Change the query of the current view without adding a history entry. */
export function replaceQuery(params: URLSearchParams): void {
  const s = params.toString().replace(/%2C/g, ",");
  const next = "#/" + current.path.map(encodeURIComponent).join("/") + (s ? "?" + s : "");
  if (next === location.hash) return;
  history.replaceState(null, "", next);
  current = parse(location.hash);
  listeners.forEach((fn) => fn());
}

export const mineralHref = (name: string) => href(`/mineral/${encodeURIComponent(name)}`);
