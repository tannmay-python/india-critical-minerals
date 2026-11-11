// Loads the JSON built by scripts/build-data.mjs. core.json is needed everywhere and loads first;
// the larger files load when a page asks for them and are then kept.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Core, Group, Mineral, VectorDef } from "./types";

const pending = new Map<string, Promise<unknown>>();
const ready = new Map<string, unknown>();

export function load<T>(file: string): Promise<T> {
  let p = pending.get(file);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${file}`).then((r) => {
      if (!r.ok) throw new Error(`${file}: ${r.status}`);
      return r.json();
    }).then((v) => { ready.set(file, v); return v; });
    pending.set(file, p);
  }
  return p as Promise<T>;
}

/** The parsed file, or undefined until it has loaded. Pass null to load nothing. */
export function useData<T>(file: string | null): T | undefined {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!file || ready.has(file)) return;
    let live = true;
    load(file).then(() => { if (live) bump((n) => n + 1); }, () => { if (live) bump((n) => n + 1); });
    return () => { live = false; };
  }, [file]);
  return file ? (ready.get(file) as T | undefined) : undefined;
}

export interface CoreIndex extends Core {
  mineral: Map<string, Mineral>;
  group: Map<number, Group>;
  vector: Map<string, VectorDef>;
  /** minerals of one group, in the dashboard's order */
  membersOf(groupId: number): Mineral[];
  /** case-insensitive lookup by name, symbol or the capability map's lowercase id */
  findMineral(key: string): Mineral | undefined;
}

const CoreContext = createContext<CoreIndex | null>(null);

export function CoreProvider({ children, fallback }: { children: ReactNode; fallback: (error: boolean) => ReactNode }) {
  const [core, setCore] = useState<Core | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { load<Core>("core.json").then(setCore, () => setFailed(true)); }, []);
  const index = useMemo<CoreIndex | null>(() => {
    if (!core) return null;
    const mineral = new Map(core.minerals.map((m) => [m.name, m]));
    const lower = new Map<string, Mineral>();
    for (const m of core.minerals) { lower.set(m.name.toLowerCase(), m); lower.set(m.symbol.toLowerCase(), m); }
    return {
      ...core,
      mineral,
      group: new Map(core.groups.map((g) => [g.id, g])),
      vector: new Map(core.vectors.map((v) => [v.key, v])),
      membersOf: (id) => core.minerals.filter((m) => m.group === id),
      findMineral: (key) => mineral.get(key) ?? lower.get(key.toLowerCase()),
    };
  }, [core]);
  if (!index) return <>{fallback(failed)}</>;
  return <CoreContext.Provider value={index}>{children}</CoreContext.Provider>;
}

export function useCore(): CoreIndex {
  const c = useContext(CoreContext);
  if (!c) throw new Error("useCore outside CoreProvider");
  return c;
}
