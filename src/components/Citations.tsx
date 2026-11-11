// Numbered citations for the capability research: text blocks carry source ids, the page shows
// them as small numbers that jump to the list at the foot.
import { useMemo } from "react";
import type { Capability, CapSource } from "../data/types";

export interface Citations { list: CapSource[]; n(id: string): number }

export function useCitations(cap: Capability | undefined, ids: string[]): Citations {
  return useMemo(() => {
    const byId = new Map((cap?.sources ?? []).map((s) => [s.id, s]));
    const list = [...new Set(ids)].map((id) => byId.get(id)).filter((s): s is CapSource => Boolean(s));
    const index = new Map(list.map((s, i) => [s.id, i + 1]));
    return { list, n: (id) => index.get(id) ?? 0 };
  }, [cap, ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Refs({ ids, cite }: { ids?: string[]; cite: Citations }) {
  const ns = [...new Set((ids ?? []).map(cite.n).filter(Boolean))].sort((a, b) => a - b);
  if (!ns.length) return null;
  return <sup className="refs">{ns.map((n, i) => <a key={n} href={`#src-${n}`} onClick={(ev) => { ev.preventDefault(); document.getElementById(`src-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}>{i ? "," : ""}{n}</a>)}</sup>;
}

export function SourcesList({ cite }: { cite: Citations }) {
  return (
    <ol className="cap-sources">
      {cite.list.map((s, i) => (
        <li key={s.id} id={`src-${i + 1}`}>
          {s.url ? <a href={s.url} target="_blank" rel="noopener">{s.title}</a> : s.title}
          <span className="muted">{[s.type, s.published].filter(Boolean).join(" · ")}</span>
        </li>
      ))}
    </ol>
  );
}
