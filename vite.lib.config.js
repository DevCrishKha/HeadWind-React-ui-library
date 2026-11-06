import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the publishable package into /dist (React is NOT bundled; it is a peer dependency).
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.js",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
});
