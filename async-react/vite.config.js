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
    // react-rx is consumed as workspace source; make sure it resolves the
    // app's React instance instead of its own devDependency copy.
    dedupe: ["react", "react-dom"],
  },
});
