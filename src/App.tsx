import { useEffect } from "react";
import { CoreProvider } from "./data/store";
import { TipProvider } from "./components/Tip";
import { Header } from "./components/Header";
import { useRoute } from "./lib/router";
import { Home } from "./pages/Home";
import "./App.css";

export function App() {
  return (
    <TipProvider>
      <Header />
      <CoreProvider fallback={(failed) => <p className="wrap load-note">{failed ? "The data could not be loaded. Reload the page to try again." : ""}</p>}>
        <Routes />
      </CoreProvider>
    </TipProvider>
  );
}

function Routes() {
  const route = useRoute();
  const section = route.path[0] ?? "";
  const page = route.path.join("/");
  // a new page starts at its top; changes of query within a page keep their place
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  switch (section) {
    default: return <Home />;
  }
}
