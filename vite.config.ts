import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base: the built site works from any folder or sub-path on static hosting.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ["maplibre-gl"], d3: ["d3", "d3-sankey"] },
      },
    },
  },
});
