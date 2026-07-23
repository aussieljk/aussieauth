import { defineConfig } from "vite";
import { base } from "./vite.base";

/**
 * The workbench's config. `cosmos.config.json` points at this by name —
 * left to itself react-cosmos picks up `vite.config.ts`, which carries the
 * TanStack Start plugin, and Start's SSR entry has no meaning for a fixture.
 */
export default defineConfig(base);
