/**
 * Tests for URL normalizer utility
 */

import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './url-normalizer';

describe('normalizeUrl', () => {
  describe('trailing slash handling', () => {
    it('should remove trailing slash from pathname', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    });

    it('should preserve root path trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('should handle multiple trailing slashes', () => {
      // URL constructor normalizes // to /, so page// becomes page/
      expect(normalizeUrl('https://example.com/page//')).toBe('https://example.com/page/');
    });
  });

  describe('fragment removal', () => {
    it('should remove hash fragments', () => {
      expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    });

    it('should remove hash from root', () => {
      expect(normalizeUrl('https://example.com/#top')).toBe('https://example.com/');
    });

    it('should handle empty hash', () => {
      expect(normalizeUrl('https://example.com/page#')).toBe('https://example.com/page');
    });
  });

  describe('query parameter sorting', () => {
    it('should sort query parameters alphabetically', () => {
      const url1 = normalizeUrl('https://example.com/page?b=2&a=1');
      const url2 = normalizeUrl('https://example.com/page?a=1&b=2');
      expect(url1).toBe(url2);
      expect(url1).toBe('https://example.com/page?a=1&b=2');
    });

    it('should handle single query parameter', () => {
      expect(normalizeUrl('https://example.com/page?a=1')).toBe('https://example.com/page?a=1');
    });

    it('should handle multiple query parameters', () => {
      const normalized = normalizeUrl('https://example.com/page?z=3&a=1&m=2');
      expect(normalized).toBe('https://example.com/page?a=1&m=2&z=3');
    });

    it('should handle empty query values', () => {
      expect(normalizeUrl('https://example.com/page?a=&b=2')).toBe(
        'https://example.com/page?a=&b=2'
      );
    });

    it('should handle query parameters with special characters', () => {
      const normalized = normalizeUrl('https://example.com/page?name=test%20value&id=123');
      expect(normalized).toContain('id=123');
      // URLSearchParams normalizes %20 to + in query strings
      expect(normalized).toContain('name=test');
    });
  });

  describe('protocol handling', () => {
    it('should preserve http protocol', () => {
      expect(normalizeUrl('http://example.com/page/')).toBe('http://example.com/page');
    });

    it('should preserve https protocol', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with ports', () => {
      expect(normalizeUrl('https://example.com:8080/page/')).toBe('https://example.com:8080/page');
    });

    it('should handle URLs with subdomains', () => {
      expect(normalizeUrl('https://www.example.com/page/')).toBe('https://www.example.com/page');
    });

    it('should handle invalid URLs gracefully', () => {
      const invalidUrl = 'not-a-valid-url';
      const result = normalizeUrl(invalidUrl);
      // Should return original URL if parsing fails
      expect(result).toBe(invalidUrl);
    });

    it('should handle empty string', () => {
      const result = normalizeUrl('');
      expect(result).toBe('');
    });

    it('should handle URLs with encoded characters', () => {
      expect(normalizeUrl('https://example.com/page%20name/')).toBe(
        'https://example.com/page%20name'
      );
    });

    it('should handle complex URLs', () => {
      const normalized = normalizeUrl('https://example.com/path/to/page/?b=2&a=1#fragment');
      expect(normalized).toBe('https://example.com/path/to/page?a=1&b=2');
    });
  });

  describe('consistency', () => {
    it('should normalize equivalent URLs to the same string', () => {
      const variants = [
        'https://example.com/page/',
        'https://example.com/page',
        'https://example.com/page/?',
        'https://example.com/page#',
        'https://example.com/page/#',
      ];

      const normalized = variants.map(normalizeUrl);
      const unique = new Set(normalized);

      // All should normalize to the same URL (empty query and hash are removed)
      expect(unique.size).toBe(1);
      expect(normalized[0]).toBe('https://example.com/page');
    });

    it('should handle query parameter order variations', () => {
      const url1 = normalizeUrl('https://example.com/page?c=3&a=1&b=2');
      const url2 = normalizeUrl('https://example.com/page?b=2&c=3&a=1');
      expect(url1).toBe(url2);
    });
  });
});
