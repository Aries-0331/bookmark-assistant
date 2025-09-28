// FINAL MINIMAL STUB (legacy removed)
export const DEFAULT_CUSTOM_PROPERTIES = Object.freeze({});
export const DATABASE_CREATION_OPTIONS: any[] = [];
export const TEMPLATE_DUPLICATION_GUIDE = Object.freeze({ steps: [], templateUrl: '', troubleshooting: [] });
export function extractDatabaseIdFromUrl(_url: string): string | null { return null; }
export async function initNotion(_token: string) { /* no-op */ }
export async function validateDuplicatedTemplate(_databaseId: string) { return { isValid: false }; }
if (typeof console !== 'undefined') console.warn('[legacy] notion.ts stub loaded');
