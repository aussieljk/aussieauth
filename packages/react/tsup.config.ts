import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  // Keep CSS imports (`./styles.css`, `@aussieljk/frosted/styles.css`) as
  // external `import` statements in the output; the consumer's bundler resolves
  // them. `./styles.css` lands next to dist/index.js — the tailwind step writes it.
  external: [/\.css$/],
});
