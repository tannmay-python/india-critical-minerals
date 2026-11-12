import { useEffect, type CSSProperties } from "react";
import { useCore } from "../data/store";
import { GroupMatrix } from "../components/GroupMatrix";
import { Radar } from "../components/Radar";
import { GROUPS_INTRO, PROFILE_TEXT, WHY_DISTINCT, fixLinks } from "../content/groups";
import { groupColor, inkOn } from "../lib/colors";
import { href, mineralHref } from "../lib/router";
import "./GroupsPage.css";

export function GroupsPage({ focus }: { focus?: string }) {
  const core = useCore();
  useEffect(() => {
    if (!focus) return;
    const id = requestAnimationFrame(() => document.getElementById(`group-${focus}`)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(id);
  }, [focus]);
  const ordered = [...core.groups].sort((a, b) => (a.id === 0 ? 1 : b.id === 0 ? -1 : a.id - b.id));
  return (
    <main className="wrap groups-page">
      <h1>The six groups</h1>
      <p className="gp-intro">{GROUPS_INTRO}</p>

      <nav className="gp-nav" aria-label="Groups">
        {ordered.map((g) => <a key={g.id} href={href(`/groups/${g.id}`)}><i className="swatch" style={{ "--c": groupColor(g.id) } as CSSProperties} />{g.name}<span className="num">{g.members.length}</span></a>)}
      </nav>

      {ordered.map((g) => {
        const members = core.membersOf(g.id);
        const color = groupColor(g.id);
        const mean = core.vectors.map((v) => members.reduce((s, m) => s + m.v[v.key], 0) / members.length / v.max);
        return (
          <section className="gp-group" id={`group-${g.id}`} key={g.id}>
            <div className="gp-head">
              <h2><i className="swatch" style={{ "--c": color } as CSSProperties} />{g.name}{g.id !== 0 && <small className="num">Group {g.id}</small>}</h2>
              {g.tagline && <p className="gp-tagline">{g.tagline}</p>}
            </div>
            <div className="gp-body">
              <div className="prose">
                {(g.body ?? "").split(/\n\s*\n/).map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: fixLinks(p) }} />)}
                {g.policy.length > 0 && (
                  <>
                    <h3>What India should do</h3>
                    <ul className="gp-policy">{g.policy.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </>
                )}
              </div>
              <div className="gp-side">
                <div className="gp-members">
                  {members.map((m) => <a key={m.name} href={mineralHref(m.name)} title={m.name} style={{ background: color, color: inkOn(color) }}>{m.symbol}</a>)}
                </div>
                {members.length > 1 && <Radar vectors={core.vectors} series={[{ label: `${g.name}, average`, color, values: mean, fill: true }]} size={230} />}
              </div>
            </div>
          </section>
        );
      })}

      <section className="gp-section">
        <h2>Average profile by group</h2>
        <p className="gp-text">{PROFILE_TEXT.split(". ").filter((_, i) => i !== 1).join(". ")}</p>
        <GroupMatrix />
      </section>

      <section className="gp-section">
        <h2>Why the groups are distinct</h2>
        <div className="prose">{WHY_DISTINCT.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: p }} />)}</div>
        <p className="gp-more"><a href={href("/method")}>How the groups were formed</a></p>
      </section>
    </main>
  );
}
