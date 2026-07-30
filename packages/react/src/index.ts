// The configured client + factory.
export * from "./client";
// The provider and hooks components read their client through.
export * from "./context";
// Failures translated into a sentence with a command in it.
export * from "./errors";
// What the deployment says this origin is allowed to do.
export * from "./appInfo";
// Reading a build-time variable without assuming which bundler is building.
export * from "./env";
// Session persistence + the account chooser's non-React helpers (localSignOut).
export * from "./storage";
export * from "./remembered";
// Wallet helpers live behind `@aussieljk/auth/solana`, so apps that never show
// the Solana button don't carry bs58 in their main bundle.
// Hooks.
export * from "./useRunner";
export * from "./useRemoteList";
export * from "./useSetupStatus";
// The method registry + marks.
export * from "./providers";
export * from "./logos";
export * from "./methods";
// Building blocks (the escape hatch — compose your own card from these).
export * from "./panels";
export * from "./ui";
export * from "./RememberedAccounts";
// The cards.
export * from "./SignIn";
export * from "./AussieAuthSignIn";
