import { useEffect } from "react";
import { CoreProvider } from "./data/store";
import { TipProvider } from "./components/Tip";
import { Header } from "./components/Header";
import { useRoute } from "./lib/router";
import { Home } from "./pages/Home";
import { MineralPage } from "./pages/MineralPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { CapabilitiesPage } from "./pages/CapabilitiesPage";
import { CapabilityPage } from "./pages/CapabilityPage";
import { TechnologyPage } from "./pages/TechnologyPage";
import { GroupsPage } from "./pages/GroupsPage";
import { MethodPage } from "./pages/MethodPage";
import { ComparePage } from "./pages/ComparePage";
import { Footer } from "./components/Footer";
import "./App.css";

export function App() {
  return (
    <TipProvider>
      <Header />
      <CoreProvider fallback={(failed) => <p className="wrap load-note">{failed ? "The data could not be loaded. Reload the page to try again." : ""}</p>}>
        <Routes />
        <SiteFooter />
      </CoreProvider>
    </TipProvider>
  );
}

function Routes() {
  const route = useRoute();
  const section = route.path[0] ?? "";
  const page = section === "groups" ? "groups" : route.path.join("/");
  // a new page starts at its top; changes of query within a page keep their place
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => {
    const name: Record<string, string> = { projects: "Projects", project: "Project", capabilities: "Capabilities", capability: "Capability", technology: "Technology", method: "Method", groups: "The six groups", compare: "Compare" };
    const part = section === "mineral" ? decodeURIComponent(route.path[1] ?? "") : name[section];
    document.title = part ? `${part} · India Critical Minerals` : "India Critical Minerals";
  }, [section, route.path]);
  switch (section) {
    case "mineral": return <MineralPage name={route.path[1] ?? ""} />;
    case "projects": return <ProjectsPage />;
    case "project": return <ProjectPage id={route.path[1] ?? ""} />;
    case "groups": return <GroupsPage focus={route.path[1]} />;
    case "capabilities": return <CapabilitiesPage />;
    case "method": return <MethodPage />;
    case "compare": return <ComparePage />;
    case "capability": return <CapabilityPage slug={route.path[1] ?? ""} />;
    case "technology": return <TechnologyPage slug={route.path[1] ?? ""} />;
    default: return <Home />;
  }
}

/** The projects page fills the window with the map, so it carries its credits in its own panel. */
function SiteFooter() {
  const route = useRoute();
  return route.path[0] === "projects" ? null : <Footer />;
}
