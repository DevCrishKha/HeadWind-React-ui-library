import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The example app lives in /example and imports the library by its package name.
export default defineConfig({
  root: "example",
  plugins: [react()],
  resolve: {
    alias: { @devcrish/headwind: path.resolve(import.meta.dirname, "src/index.js") },
  },
  build: { outDir: "../dist-example", emptyOutDir: true },
});
