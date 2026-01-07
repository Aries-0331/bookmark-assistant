/**
 * Server-side description extraction service
 * Fetches URLs and extracts descriptions from meta tags
 */

import { URL } from 'url';
import { descriptionCache } from './description-cache';

export interface ExtractionResult {
  description: string;
  source: 'meta_description' | 'og_description' | 'title' | 'content' | 'empty';
  success: boolean;
  error?: string;
  url: string;
  fromCache?: boolean;
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
      // Normalize URL for consistent caching
      const normalizedUrl = this.normalizeUrl(url);

      // Check cache first
      const cached = await descriptionCache.get(normalizedUrl);
      if (cached) {
        console.debug(`[DescriptionExtractor] Cache hit for ${normalizedUrl} (hits: ${cached.hits})`);
        return {
          description: cached.description,
          source: cached.source,
          success: true,
          url: normalizedUrl,
          fromCache: true,
        };
      }

      console.debug(`[DescriptionExtractor] Cache miss for ${normalizedUrl}, fetching...`);

      // Validate URL
      if (!this.isValidUrl(normalizedUrl)) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'Invalid URL',
          url: normalizedUrl,
          fromCache: false,
        };
      }

      // Skip non-HTTP URLs
      if (!this.isFetchableUrl(normalizedUrl)) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'URL is not fetchable',
          url: normalizedUrl,
          fromCache: false,
        };
      }

      // Fetch HTML
      const html = await this.fetchHtml(normalizedUrl);
      if (!html) {
        return {
          description: '',
          source: 'empty',
          success: false,
          error: 'Failed to fetch HTML',
          url: normalizedUrl,
          fromCache: false,
        };
      }

      // Extract description
      const description = this.extractDescription(html);

      // Cache the result (async, don't wait)
      if (description.text) {
        descriptionCache
          .set(normalizedUrl, description.text, description.source)
          .catch((err) => console.warn('[DescriptionExtractor] Failed to cache:', err));
      }

      return {
        description: description.text,
        source: description.source,
        success: true,
        url: normalizedUrl,
        fromCache: false,
      };
    } catch (error) {
      return {
        description: '',
        source: 'empty',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
        fromCache: false,
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
      const metaDesc = this.sanitizeDescription(metaDescriptionMatch[1]);
      // Validate that meta description is reasonable (not a title)
      if (this.isValidDescription(metaDesc)) {
        return {
          text: metaDesc,
          source: 'meta_description',
        };
      }
    }

    // Priority 2: <meta property="og:description">
    const ogDescriptionMatch = html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );
    if (ogDescriptionMatch && ogDescriptionMatch[1]?.trim()) {
      const ogDesc = this.sanitizeDescription(ogDescriptionMatch[1]);
      // Validate that og:description is reasonable (not a title)
      if (this.isValidDescription(ogDesc)) {
        return {
          text: ogDesc,
          source: 'og_description',
        };
      }
    }

    // Priority 3: Extract content from structured elements
    const contentMatch = this.extractContentFromStructuredElements(html);
    if (contentMatch) {
      return contentMatch;
    }

    // Priority 4: <title> tag (only if it looks like a description, not a brand/nav title)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]?.trim()) {
      const title = this.sanitizeDescription(titleMatch[1]);
      // Only use title if it reads like a description (descriptive, not just branding/navigation)
      if (title.length >= 20 && title.length <= 200 && this.looksLikeDescription(title)) {
        return {
          text: title,
          source: 'title',
        };
      }
    }

    // Priority 5: First paragraph from body (more lenient extraction)
    const bodyParagraphMatch = html.match(/<body[^>]*>[\s\S]*?<p[^>]*>([^<]{20,300})<\/p>/i);
    if (bodyParagraphMatch && bodyParagraphMatch[1]?.trim()) {
      const content = this.sanitizeDescription(bodyParagraphMatch[1]);
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
   * Extract content from structured elements (main, article, section)
   */
  private extractContentFromStructuredElements(
    html: string
  ): { text: string; source: ExtractionResult['source'] } | null {
    // Try to extract from main/article sections first
    const structuredMatch = html.match(
      /<(?:main|article|section)[^>]*>([\s\S]*?)<\/(?:main|article|section)>/i
    );

    if (structuredMatch) {
      const sectionContent = structuredMatch[1];

      // Look for paragraphs in the structured content
      const paragraphMatches = sectionContent.match(/<p[^>]*>([^<]{20,500})<\/p>/gi) || [];

      for (const para of paragraphMatches) {
        const contentMatch = para.match(/<p[^>]*>([^<]+)<\/p>/i);
        if (contentMatch && contentMatch[1]) {
          const content = this.sanitizeDescription(contentMatch[1]);

          // Validate this content looks like a description
          if (content.length >= 20 && content.length <= 400 && this.isValidDescription(content)) {
            // Truncate if too long
            const truncated = content.length > 200 ? content.substring(0, 200) + '...' : content;
            return {
              text: truncated,
              source: 'content',
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if text looks like a description (not just a title or navigation)
   */
  private looksLikeDescription(text: string): boolean {
    const trimmed = text.trim();

    // Reject if too short or too long
    if (trimmed.length < 20 || trimmed.length > 200) {
      return false;
    }

    // Reject common title patterns
    const titlePatterns = [
      /^[\w\s]+ - [\w\s]+$/, // "Brand - Page"
      /^[\w\s]+\|[\w\s]+$/, // "Brand | Page"
      /^[\w\s]+::[\w\s]+$/, // "Brand :: Page"
      /^[\w\s]+ - Home$/, // "Brand - Home"
      /^Home - [\w\s]+$/, // "Home - Brand"
      /^(Login|Sign[\s-]?up|Sign[\s-]?in|Register|Contact|About|FAQ|Help)$/i, // Single navigation words
      /^(Home|404|Error|Page Not Found)$/i, // Simple page names
    ];

    for (const pattern of titlePatterns) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    // Prefer text that looks like a sentence (has multiple words, starts with capital, etc.)
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 3) {
      return false;
    }

    // If it contains question words or descriptive language, likely a description
    const descriptiveIndicators = [
      'how to',
      'what is',
      'why',
      'when',
      'where',
      'learn',
      'guide',
      'tips',
      'best',
      'top',
      'review',
      'comparison',
      'vs',
      'about',
      'introduction',
      'overview',
      'understanding',
      'explained',
      'discover',
      'find out',
    ];

    const lowerText = trimmed.toLowerCase();
    for (const indicator of descriptiveIndicators) {
      if (lowerText.includes(indicator)) {
        return true;
      }
    }

    // If it reads like a sentence (has periods, question marks, etc.), likely a description
    if (/[.!?]/.test(trimmed)) {
      return true;
    }

    // If it's multiple words without obvious brand separators, could be a description
    // But be more lenient for titles - if it passes other checks, accept it
    return wordCount >= 5;
  }

  /**
   * Check if a description is valid (not a title, not just branding)
   */
  private isValidDescription(text: string): boolean {
    const trimmed = text.trim();

    // Must be reasonable length
    if (trimmed.length < 10 || trimmed.length > 500) {
      return false;
    }

    // Reject if it's obviously a title (too short, has brand separators)
    if (trimmed.length < 15) {
      const brandPatterns = /[-|:|]|\b(home|login|signup|register|contact|about|faq|help)\b/i;
      if (brandPatterns.test(trimmed)) {
        return false;
      }
    }

    // Reject all-caps titles (often site names)
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 30) {
      return false;
    }

    // Reject single words or very short phrases
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 2) {
      return false;
    }

    // Looks good!
    return true;
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
