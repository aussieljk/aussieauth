import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/expo.tsx",
    // The Convex wiring lives on its own entry rather than in `index`, so the
    // root entry keeps importing no Convex — the card works in apps that have
    // none, and that's worth an extra subpath.
    "src/convex.tsx",
    "src/native.tsx",
    "src/solana.ts",
    "src/cli.ts",
    // MSW handlers + the wrapper, so a consumer can render the card with no
    // deployment behind it. `msw` is an optional peer, external by virtue of
    // being declared in package.json.
    "src/testing/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  // Keep CSS imports (`./styles.css`, `@aussieljk/frosted/styles.css`) as
  // external `import` statements in the output; the consumer's bundler resolves
  // them. `./styles.css` lands next to dist/index.js — the tailwind step writes it.
  external: [/\.css$/, "react-native", "expo-router"],
});
