import { useEffect, useState } from 'react';

export type RouteId = 'general' | 'notifications' | 'advanced' | 'faq' | 'tutorials' | 'about';

export const defaultRoute: RouteId = 'general';

export const normalizeHash = (hash: string): RouteId => {
  const val = hash.replace(/^#\/?/, '').toLowerCase();
  if (val === 'overview') return 'general';
  if (val === 'connection') return 'general';
  const allowed: RouteId[] = ['general', 'notifications', 'advanced', 'faq', 'tutorials', 'about'];
  return allowed.includes(val as RouteId) ? (val as RouteId) : defaultRoute;
};

export function useHashRoute() {
  const [route, setRoute] = useState<RouteId>(() => normalizeHash(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(normalizeHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    // Ensure initial hash is normalized
    if (!window.location.hash) window.location.hash = `#/${route}`;
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (to: RouteId) => {
    if (normalizeHash(`#/${to}`) === route) return;
    window.location.hash = `#/${to}`;
  };

  return { route, navigate } as const;
}
