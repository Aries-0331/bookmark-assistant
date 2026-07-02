import { describe, expect, it } from 'vitest';
import {
  extractContentFromStructuredElements,
  extractDescriptionFromHtml,
  isValidDescription,
  looksLikeDescription,
  sanitizeDescription,
} from './index';

describe('server description core', () => {
  it('prefers valid meta description over og description', () => {
    const result = extractDescriptionFromHtml(`
      <html>
        <head>
          <meta name="description" content="Primary page description" />
          <meta property="og:description" content="Secondary page description" />
        </head>
      </html>
    `);

    expect(result).toEqual({
      text: 'Primary page description',
      source: 'meta_description',
    });
  });

  it('falls back to og description when meta description is missing', () => {
    const result = extractDescriptionFromHtml(`
      <html>
        <head>
          <meta property="og:description" content="Open graph page description" />
        </head>
      </html>
    `);

    expect(result).toEqual({
      text: 'Open graph page description',
      source: 'og_description',
    });
  });

  it('rejects title-like meta descriptions', () => {
    expect(
      extractDescriptionFromHtml(`
        <html>
          <head>
            <meta name="description" content="Home - ACME Corp" />
          </head>
        </html>
      `)
    ).toEqual({
      text: '',
      source: 'empty',
    });
  });

  it('extracts structured main/article/section paragraph content before title fallback', () => {
    const result = extractDescriptionFromHtml(`
      <html>
        <head>
          <title>How to build a REST API in Node.js - A comprehensive guide</title>
        </head>
        <body>
          <article>
            <p>Article content describing the main topic of this page.</p>
          </article>
        </body>
      </html>
    `);

    expect(result).toEqual({
      text: 'Article content describing the main topic of this page.',
      source: 'content',
    });
  });

  it('uses descriptive titles when no stronger description exists', () => {
    const result = extractDescriptionFromHtml(`
      <html>
        <head>
          <title>What is Docker and how does it work? An introduction to containerization</title>
        </head>
      </html>
    `);

    expect(result).toEqual({
      text: 'What is Docker and how does it work? An introduction to containerization',
      source: 'title',
    });
  });

  it('falls back to the first body paragraph', () => {
    const result = extractDescriptionFromHtml(`
      <html>
        <body>
          <p>This is the first paragraph with substantial content describing the page.</p>
          <p>This is the second paragraph.</p>
        </body>
      </html>
    `);

    expect(result).toEqual({
      text: 'This is the first paragraph with substantial content describing the page.',
      source: 'content',
    });
  });

  it('returns empty when no usable description is present', () => {
    expect(
      extractDescriptionFromHtml(`
        <html>
          <head><title>No Description</title></head>
          <body><p>Too short</p></body>
        </html>
      `)
    ).toEqual({
      text: '',
      source: 'empty',
    });
  });

  it('extracts structured content directly', () => {
    expect(
      extractContentFromStructuredElements(`
        <main>
          <p>Section content within main tag providing page description.</p>
        </main>
      `)
    ).toEqual({
      text: 'Section content within main tag providing page description.',
      source: 'content',
    });
  });

  it('truncates long structured content to 200 characters plus ellipsis', () => {
    const result = extractContentFromStructuredElements(`<main><p>${'A'.repeat(300)}</p></main>`);

    expect(result?.text).toHaveLength(203);
    expect(result?.text.endsWith('...')).toBe(true);
  });

  it('validates descriptions using existing title and length heuristics', () => {
    expect(isValidDescription('Learn how to build modern web applications')).toBe(true);
    expect(isValidDescription('Home - Brand')).toBe(false);
    expect(isValidDescription('ACME CORPORATION')).toBe(false);
    expect(isValidDescription('A'.repeat(501))).toBe(false);
  });

  it('detects descriptive titles without accepting navigation labels', () => {
    expect(looksLikeDescription('How to build modern web applications')).toBe(true);
    expect(looksLikeDescription('Brand | Page')).toBe(false);
    expect(looksLikeDescription('Login')).toBe(false);
    expect(looksLikeDescription('A'.repeat(201))).toBe(false);
  });

  it('strips tags, replaces entities, normalizes whitespace, and caps length', () => {
    const result = sanitizeDescription(`<p>${'Text &amp; content '.repeat(40)}</p>`);

    expect(result).not.toContain('<p>');
    expect(result).not.toContain('&amp;');
    expect(result).toHaveLength(500);
  });
});
