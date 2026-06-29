import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  createFallbackPageContent,
  extractPageContentFromDocument,
  isValidHttpUrl,
} from './index';

function createDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('content helpers', () => {
  describe('isValidHttpUrl', () => {
    it('accepts http and https URLs', () => {
      expect(isValidHttpUrl('https://example.com/page')).toBe(true);
      expect(isValidHttpUrl('http://example.com/page')).toBe(true);
    });

    it('rejects invalid and non-http URLs', () => {
      expect(isValidHttpUrl('not-a-url')).toBe(false);
      expect(isValidHttpUrl('file:///tmp/page.html')).toBe(false);
      expect(isValidHttpUrl('chrome://extensions')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });
  });

  describe('createFallbackPageContent', () => {
    it('creates fallback content for a valid URL', () => {
      expect(createFallbackPageContent('https://www.example.com/docs/page')).toEqual({
        text: 'Content from www.example.com',
        title: 'example.com/docs/page',
        description: 'Bookmarked from www.example.com',
        keywords: ['example.com'],
      });
    });

    it('creates fallback content for an invalid URL', () => {
      expect(createFallbackPageContent('not-a-url')).toEqual({
        text: '',
        title: 'not-a-url',
        description: 'Bookmarked URL',
        keywords: ['bookmark'],
      });
    });
  });

  describe('extractPageContentFromDocument', () => {
    it('uses document title before h1 and open graph title', () => {
      const documentRef = createDocument(`
        <html>
          <head>
            <title>Document Title</title>
            <meta property="og:title" content="Open Graph Title" />
          </head>
          <body>
            <h1>Heading Title</h1>
            <main>${'Main content '.repeat(20)}</main>
          </body>
        </html>
      `);

      expect(extractPageContentFromDocument(documentRef).title).toBe('Document Title');
    });

    it('falls back from missing document title to h1 before open graph title', () => {
      const documentRef = createDocument(`
        <html>
          <head>
            <meta property="og:title" content="Open Graph Title" />
          </head>
          <body>
            <h1>Heading Title</h1>
            <main>${'Main content '.repeat(20)}</main>
          </body>
        </html>
      `);

      expect(extractPageContentFromDocument(documentRef).title).toBe('Heading Title');
    });

    it('extracts meta description by priority', () => {
      const documentRef = createDocument(`
        <html>
          <head>
            <meta name="description" content="Primary description" />
            <meta property="og:description" content="Open Graph description" />
            <meta name="twitter:description" content="Twitter description" />
          </head>
          <body><main>${'Main content '.repeat(20)}</main></body>
        </html>
      `);

      expect(extractPageContentFromDocument(documentRef).description).toBe('Primary description');
    });

    it('splits and trims keywords', () => {
      const documentRef = createDocument(`
        <html>
          <head>
            <meta name="keywords" content=" bookmarks, notion, , reading list , " />
          </head>
          <body><main>${'Main content '.repeat(20)}</main></body>
        </html>
      `);

      expect(extractPageContentFromDocument(documentRef).keywords).toEqual([
        'bookmarks',
        'notion',
        'reading list',
      ]);
    });

    it('prefers main content over article content', () => {
      const documentRef = createDocument(`
        <html>
          <body>
            <main>${'Main preferred content '.repeat(10)}</main>
            <article>${'Article secondary content '.repeat(10)}</article>
          </body>
        </html>
      `);

      const result = extractPageContentFromDocument(documentRef);

      expect(result.text).toContain('Main preferred content');
      expect(result.text).not.toContain('Article secondary content');
    });

    it('falls back to body content after removing scripts styles nav footer and sidebar', () => {
      const documentRef = createDocument(`
        <html>
          <body>
            <nav>Navigation should be removed</nav>
            <style>.hidden { display: none; }</style>
            <script>window.secret = true;</script>
            <aside>Aside should be removed</aside>
            <div class="sidebar">Sidebar should be removed</div>
            <div class="navigation">Secondary navigation should be removed</div>
            <section>${'Useful body content '.repeat(8)}</section>
            <footer>Footer should be removed</footer>
          </body>
        </html>
      `);

      const result = extractPageContentFromDocument(documentRef);

      expect(result.text).toContain('Useful body content');
      expect(result.text).not.toContain('Navigation should be removed');
      expect(result.text).not.toContain('window.secret');
      expect(result.text).not.toContain('Footer should be removed');
      expect(result.text).not.toContain('Sidebar should be removed');
    });

    it('cleans whitespace and limits content length', () => {
      const longContent = `First line\n\nSecond\t\tline ${'word '.repeat(6000)}`;
      const documentRef = createDocument(`
        <html>
          <body>
            <main>${longContent}</main>
          </body>
        </html>
      `);

      const result = extractPageContentFromDocument(documentRef);

      expect(result.text).toMatch(/^First line Second line word/);
      expect(result.text).not.toContain('\n');
      expect(result.text.length).toBe(5000);
    });
  });
});
