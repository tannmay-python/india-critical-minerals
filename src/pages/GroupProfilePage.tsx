// The average profile by group: every sub-score averaged over each group's members. It has its own
// page, as group-profiles.html does on the dashboard, and the Groups page links to it.
import { GroupMatrix } from "../components/GroupMatrix";
import { PROFILE_TEXT } from "../content/groups";
import { href } from "../lib/router";
import "./GroupsPage.css";

export function GroupProfilePage() {
  return (
    <main className="wrap groups-page">
      <nav className="gp-back" aria-label="Back"><a href={href("/groups")}>Groups</a></nav>
      <h1>Average profile by group</h1>
      <p className="gp-intro">{PROFILE_TEXT.split(". ").filter((_, i) => i !== 1).join(". ")}</p>
      <div className="gp-matrix"><GroupMatrix /></div>
    </main>
  );
}
