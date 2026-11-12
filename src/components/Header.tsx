import { useEffect, useState } from "react";
import { href, useRoute } from "../lib/router";
import { Search } from "./Search";
import "./Header.css";

const NAV = [
  { label: "Overview", path: "/", match: ["", "groups"] },
  { label: "Explorer", path: "/explorer", match: ["explorer", "mineral", "compare"] },
  { label: "Projects", path: "/projects", match: ["projects", "project"] },
  { label: "Capabilities", path: "/capabilities", match: ["capabilities", "capability", "technology"] },
  { label: "Method", path: "/method", match: ["method"] },
];

export function Header() {
  const route = useRoute();
  const section = route.path[0] ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route.raw]);
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="header-logo" href="https://takshashila.org.in" target="_blank" rel="noopener" aria-label="The Takshashila Institution">
          <img src={`${import.meta.env.BASE_URL}takshashila-logo.svg`} alt="" height={38} />
        </a>
        <a className="header-title" href={href("/")}>India Critical Minerals</a>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">Menu</span><i aria-hidden="true" />
        </button>
        <nav id="site-nav" className={open ? "open" : ""} aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.path} href={href(n.path)} aria-current={n.match.includes(section) ? "page" : undefined}>{n.label}</a>
          ))}
        </nav>
        <Search />
      </div>
    </header>
  );
}
