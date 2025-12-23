/**
 * Server-side description extraction service
 * Fetches URLs and extracts descriptions from meta tags
 */

import { URL } from 'url';

export interface ExtractionResult {
  description: string;
  source: 'meta_description' | 'og_description' | 'title' | 'content' | 'empty';
  success: boolean;
  error?: string;
  url: string;
}

export class DescriptionExtractor {
  private readonly timeoutMs = 5000; // 5 seconds
  private readonly maxHtmlSize = 5 * 1024 * 1024; // 5MB
  private readonly userAgent = 'BookmarkAssistant/1.0 (+https://bookmark-assistant.com)';

  /**
   * Extract description from a URL
   */
  async extractFromUrl(url: string): Promise<ExtractionResult> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'Invalid URL',
          url,
        };
      }

      // Skip non-HTTP URLs
      if (!this.isFetchableUrl(url)) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'URL is not fetchable',
          url,
        };
      }

      // Fetch HTML
      const html = await this.fetchHtml(url);
      if (!html) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'Failed to fetch HTML',
          url,
        };
      }

      // Extract description
      const description = this.extractDescription(html);

      return {
        description: description.text,
        source: description.source,
        success: true,
        url,
      };
    } catch (error) {
      return {
        description: '',
        source: 'empty',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
      };
    }
  }

  /**
   * Extract description from HTML string
   */
  private extractDescription(html: string): { text: string; source: ExtractionResult['source'] } {
    // Priority 1: <meta name="description">
    const metaDescriptionMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
    );
    if (metaDescriptionMatch && metaDescriptionMatch[1]?.trim()) {
      return {
        text: this.sanitizeDescription(metaDescriptionMatch[1]),
        source: 'meta_description',
      };
    }

    // Priority 2: <meta property="og:description">
    const ogDescriptionMatch = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );
    if (ogDescriptionMatch && ogDescriptionMatch[1]?.trim()) {
      return {
        text: this.sanitizeDescription(ogDescriptionMatch[1]),
        source: 'og_description',
      };
    }

    // Priority 3: <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]?.trim()) {
      const title = this.sanitizeDescription(titleMatch[1]);
      // Only use title if it's reasonable (not too short, not too long)
      if (title.length >= 10 && title.length <= 200) {
        return {
          text: title,
          source: 'title',
        };
      }
    }

    // Priority 4: First paragraph in main/article
    const mainContentMatch = html.match(/<(?:main|article)[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i);
    if (mainContentMatch && mainContentMatch[1]?.trim()) {
      const content = this.sanitizeDescription(mainContentMatch[1]);
      if (content.length >= 20 && content.length <= 300) {
        return {
          text: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          source: 'content',
        };
      }
    }

    return {
      text: '',
      source: 'empty',
    };
  }

  /**
   * Fetch HTML from URL
   */
  private async fetchHtml(url: string): Promise<string | null> {
    try {
      // Use native fetch (Node.js 18+)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          // @ts-expect-error - size limit not in types but supported
          size: this.maxHtmlSize,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`[DescriptionExtractor] HTTP ${response.status} for ${url}`);
          return null;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          console.warn(`[DescriptionExtractor] Non-HTML content type: ${contentType} for ${url}`);
          return null;
        }

        const html = await response.text();
        return html;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn(`[DescriptionExtractor] Timeout fetching ${url}`);
        } else {
          console.warn(`[DescriptionExtractor] Error fetching ${url}:`, error.message);
        }
        return null;
      }
    } catch (error) {
      console.error(`[DescriptionExtractor] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is fetchable (HTTP/HTTPS only)
   */
  private isFetchableUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize description text
   */
  private sanitizeDescription(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[#\w]+;/g, ' ') // Replace HTML entities with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 500); // Limit length
  }

  /**
   * Normalize URL for caching (same logic as client)
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove trailing slash from pathname (except root)
      if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }

      // Remove fragments
      urlObj.hash = '';

      // Sort query parameters
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
}

// Singleton instance
export const descriptionExtractor = new DescriptionExtractor();
