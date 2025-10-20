export type Edition = 'open-source' | 'pro';

export function getEdition(): Edition {
  // Try Node env first (server), then Vite env (extension)
  const fromNode =
    typeof globalThis !== 'undefined' && 'process' in globalThis && (globalThis as any).process?.env
      ? (globalThis as any).process.env.EDITION
      : undefined;

  const fromVite =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.EDITION
      : undefined;

  const v = fromNode ?? fromVite ?? 'open-source';
  return v === 'pro' ? 'pro' : 'open-source';
}

export const isPro = () => getEdition() === 'pro';
export const isOSS = () => getEdition() === 'open-source';
