// Deprecated legacy direct Notion client removed.
// This file kept as a no-op shim to avoid breaking stale imports during migration.
// All Notion operations must go through secure server endpoints exposed in server-api.ts.
console.warn('[legacy] notion-client shim loaded – migrate any remaining direct imports to serverAPI.');
export {};
