/**
 * The module `index.html` points at, and the entry react-cosmos replaces with
 * its own renderer at build time ("Loading Cosmos renderer at …").
 *
 * It exists as a real file only so the path resolves when cosmos *isn't* the
 * one doing the resolving — vitest's browser server serves the same
 * `index.html` and logs a pre-transform error for every script it can't load.
 * Nothing here ever runs.
 */
export const COSMOS_ENTRY_PLACEHOLDER = true;
