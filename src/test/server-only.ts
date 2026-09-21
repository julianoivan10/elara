// Test stand-in for the "server-only" package, which throws outside a React
// Server environment. Aliased in vitest.config.mts so server modules (auth,
// OAuth) can be unit tested; the real package still guards the app bundles.
export {};
