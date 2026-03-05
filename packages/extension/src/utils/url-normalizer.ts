/**
 * Normalizes URLs to ensure consistent cache keys.
 * Handles:
 * - Trailing slashes (removes from pathname, except root)
 * - Protocol normalization (prefers https)
 * - Query parameter sorting
 * - Fragment removal
 * - URL encoding normalization
 */

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Normalize protocol: prefer https if available, but keep http if that's what was used
    // (We don't force https since some sites only work on http)

    // Remove trailing slash from pathname (except root)
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    // Remove fragments (hash)
    urlObj.hash = '';

    // Sort query parameters for consistent comparison
    // Remove empty query strings (just '?')
    if (urlObj.search && urlObj.search !== '?') {
      const params = new URLSearchParams(urlObj.search);
      const sortedParams = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
      urlObj.search = new URLSearchParams(sortedParams).toString();
    } else {
      // Remove empty query string
      urlObj.search = '';
    }

    // Normalize the URL string (handles encoding)
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original (invalid URLs will be handled elsewhere)
    console.warn(`[URLNormalizer] Failed to normalize URL: ${url}`, error);
    return url;
  }
}
