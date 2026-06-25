import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './index';

describe('normalizeUrl', () => {
  describe('trailing slash handling', () => {
    it('removes trailing slash from pathname', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    });

    it('preserves root path trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('handles multiple trailing slashes', () => {
      expect(normalizeUrl('https://example.com/page//')).toBe('https://example.com/page/');
    });
  });

  describe('fragment removal', () => {
    it('removes hash fragments', () => {
      expect(normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    });

    it('removes hash from root', () => {
      expect(normalizeUrl('https://example.com/#top')).toBe('https://example.com/');
    });

    it('handles empty hash', () => {
      expect(normalizeUrl('https://example.com/page#')).toBe('https://example.com/page');
    });
  });

  describe('query parameter sorting', () => {
    it('sorts query parameters alphabetically', () => {
      const url1 = normalizeUrl('https://example.com/page?b=2&a=1');
      const url2 = normalizeUrl('https://example.com/page?a=1&b=2');

      expect(url1).toBe(url2);
      expect(url1).toBe('https://example.com/page?a=1&b=2');
    });

    it('handles single query parameter', () => {
      expect(normalizeUrl('https://example.com/page?a=1')).toBe('https://example.com/page?a=1');
    });

    it('handles multiple query parameters', () => {
      expect(normalizeUrl('https://example.com/page?z=3&a=1&m=2')).toBe(
        'https://example.com/page?a=1&m=2&z=3'
      );
    });

    it('handles empty query values', () => {
      expect(normalizeUrl('https://example.com/page?a=&b=2')).toBe(
        'https://example.com/page?a=&b=2'
      );
    });

    it('handles query parameters with special characters', () => {
      const normalized = normalizeUrl('https://example.com/page?name=test%20value&id=123');

      expect(normalized).toContain('id=123');
      expect(normalized).toContain('name=test');
    });
  });

  describe('protocol handling', () => {
    it('preserves http protocol', () => {
      expect(normalizeUrl('http://example.com/page/')).toBe('http://example.com/page');
    });

    it('preserves https protocol', () => {
      expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    });
  });

  describe('edge cases', () => {
    it('handles URLs with ports', () => {
      expect(normalizeUrl('https://example.com:8080/page/')).toBe('https://example.com:8080/page');
    });

    it('handles URLs with subdomains', () => {
      expect(normalizeUrl('https://www.example.com/page/')).toBe('https://www.example.com/page');
    });

    it('handles invalid URLs gracefully', () => {
      expect(normalizeUrl('not-a-valid-url')).toBe('not-a-valid-url');
    });

    it('handles empty string', () => {
      expect(normalizeUrl('')).toBe('');
    });

    it('handles URLs with encoded characters', () => {
      expect(normalizeUrl('https://example.com/page%20name/')).toBe(
        'https://example.com/page%20name'
      );
    });

    it('handles complex URLs', () => {
      expect(normalizeUrl('https://example.com/path/to/page/?b=2&a=1#fragment')).toBe(
        'https://example.com/path/to/page?a=1&b=2'
      );
    });
  });

  describe('consistency', () => {
    it('normalizes equivalent URLs to the same string', () => {
      const variants = [
        'https://example.com/page/',
        'https://example.com/page',
        'https://example.com/page/?',
        'https://example.com/page#',
        'https://example.com/page/#',
      ];

      const normalized = variants.map(normalizeUrl);

      expect(new Set(normalized).size).toBe(1);
      expect(normalized[0]).toBe('https://example.com/page');
    });

    it('handles query parameter order variations', () => {
      const url1 = normalizeUrl('https://example.com/page?c=3&a=1&b=2');
      const url2 = normalizeUrl('https://example.com/page?b=2&c=3&a=1');

      expect(url1).toBe(url2);
    });
  });
});
