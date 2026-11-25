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
        // Vite 8 takes a function here: the map library and d3 each get their own chunk
        manualChunks(id: string) {
          if (id.includes("/node_modules/maplibre-gl/")) return "maplibre";
          if (/\/node_modules\/d3(-[a-z]+)?\//.test(id)) return "d3";
        },
      },
    },
  },
});
