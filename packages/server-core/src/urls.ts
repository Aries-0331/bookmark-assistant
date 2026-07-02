/**
 * Normalize URLs for stable sync and cache keys.
 *
 * The behavior intentionally matches the extension-side URL normalizer:
 * remove fragments, sort query parameters, and remove non-root trailing slashes.
 * Invalid input is returned unchanged so callers can validate separately.
 */
export function normalizeUrlForSync(url: string): string {
  try {
    const urlObj = new URL(url);

    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    urlObj.hash = '';

    if (urlObj.search && urlObj.search !== '?') {
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
      urlObj.search = new URLSearchParams(sortedParams).toString();
    } else {
      urlObj.search = '';
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isFetchableHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
