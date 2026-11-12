import { AUTHORS } from "../content/home";
import { href } from "../lib/router";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>A <a href="https://takshashila.org.in" target="_blank" rel="noopener">Takshashila Institution</a> analysis</span>
        <span>{AUTHORS.map((a, i) => <span key={a.name}>{i ? " & " : ""}<a href={a.url} target="_blank" rel="noopener">{a.name}</a></span>)}</span>
        <a href={href("/method")}>Method and data</a>
      </div>
    </footer>
  );
}
