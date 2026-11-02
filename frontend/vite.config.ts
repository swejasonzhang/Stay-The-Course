import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite builds and serves the frontend; the "test" section configures Vitest (npm test).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
  },
});
