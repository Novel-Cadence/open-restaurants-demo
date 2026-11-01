import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite would load the parent app's PostCSS config from this folder.
  // Skip it. Tailwind for this demo is the plugin above.
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.js"],
  },
});
