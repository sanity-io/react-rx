import path from "path";
import tailwindcss from "@tailwindcss/vite";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({}), tailwindcss()],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
    },
    // react-rx is linked from ../packages/react-rx and compiled from source;
    // its sibling node_modules has its own react/rxjs copies. Dedupe so the
    // app bundles exactly one of each.
    dedupe: ["react", "react-dom", "rxjs"],
  },
});
