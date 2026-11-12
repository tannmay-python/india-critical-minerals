// Up to three minerals side by side: their shapes on one radar and their ten scores in one table.
import { useCore } from "../data/store";
import { Radar } from "../components/Radar";
import { href, mineralHref, replaceQuery, useRoute } from "../lib/router";
import "./ComparePage.css";

const COLORS = ["#620d3c", "#f1a222", "#1d677f"];

export function ComparePage() {
  const core = useCore();
  const { params } = useRoute();
  const picked = (params.get("m") ?? "").split(",").map((n) => core.findMineral(n)).filter((m, i, a) => m && a.indexOf(m) === i).slice(0, 3).map((m) => m!);
  const set = (list: string[]) => { const q = new URLSearchParams(params); list.length ? q.set("m", list.join(",")) : q.delete("m"); replaceQuery(q); };
  const names = picked.map((m) => m.name);
  const sorted = [...core.minerals].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="wrap compare">
      <h1>Compare</h1>
      <div className="compare-picks">
        {[0, 1, 2].map((i) => (
          <label key={i} className={picked[i] ? "on" : ""}>
            <i className="key-line" style={{ background: COLORS[i] }} />
            <select value={picked[i]?.name ?? ""} aria-label={`Mineral ${i + 1}`}
              onChange={(ev) => { const next = [...names]; if (ev.target.value) next[i] = ev.target.value; else next.splice(i, 1); set(next.filter(Boolean)); }}>
              <option value="">{i < picked.length + 1 ? "Add a mineral" : ""}</option>
              {sorted.map((m) => <option key={m.name} value={m.name} disabled={names.includes(m.name) && picked[i]?.name !== m.name}>{m.name}</option>)}
            </select>
          </label>
        ))}
      </div>

      {picked.length > 0 && (
        <div className="compare-body">
          <Radar vectors={core.vectors} size={300} series={picked.map((m, i) => ({ label: m.name, color: COLORS[i], values: core.vectors.map((v) => m.v[v.key] / v.max), fill: picked.length === 1 }))} />
          <table className="compare-table">
            <thead>
              <tr><th />{picked.map((m, i) => <th key={m.name} scope="col"><a href={mineralHref(m.name)}><i className="key-line" style={{ background: COLORS[i] }} />{m.name}</a><small>{core.group.get(m.group)?.name}</small></th>)}</tr>
            </thead>
            <tbody>
              {core.vectors.map((v) => (
                <tr key={v.key}>
                  <th scope="row">{v.name}</th>
                  {picked.map((m, i) => (
                    <td key={m.name}>
                      <span className="cmp-bar"><i style={{ width: `${(m.v[v.key] / v.max) * 100}%`, background: COLORS[i] }} /></span>
                      <b className="num">{m.v[v.key]}</b><small className="num">/{v.max}</small>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {picked.length === 0 && <p className="compare-empty"><a href={href("/")}>Pick from the table of 51</a></p>}
    </main>
  );
}
