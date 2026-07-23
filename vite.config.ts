/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { playwright } from "@vitest/browser-playwright";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/convex": path.resolve(__dirname, "./convex"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        // The security-critical logic that has no UI: signature verification,
        // the demo lockdown's path matcher, account-number handling. Plain
        // node, no browser — these are the tests worth running on every save.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
        },
      },
      {
        // The components, driven in a real browser through the same fixtures
        // `bun run cosmos` renders. `.tsx` is the whole selector: anything that
        // needs a DOM is JSX, anything that doesn't is `.ts` and runs above.
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/testing/setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
