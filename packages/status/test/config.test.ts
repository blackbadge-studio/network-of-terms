import { describe, it, expect } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/test';
const { withDefaultSslMode } = await import('../src/config.js');

describe('withDefaultSslMode', () => {
  it('adds sslmode=prefer when the URL has no SSL setting', () => {
    expect(
      withDefaultSslMode('postgres://user:pass@db.example.com:5432/app'),
    ).toBe('postgres://user:pass@db.example.com:5432/app?sslmode=prefer');
  });

  it('keeps an explicit sslmode', () => {
    const url = 'postgres://user:pass@db.example.com/app?sslmode=disable';
    expect(withDefaultSslMode(url)).toBe(url);
  });

  it('keeps an explicit ssl parameter', () => {
    const url = 'postgres://user:pass@db.example.com/app?ssl=true';
    expect(withDefaultSslMode(url)).toBe(url);
  });

  it('preserves other query parameters', () => {
    expect(
      withDefaultSslMode('postgres://u:p@h/app?application_name=status'),
    ).toBe('postgres://u:p@h/app?application_name=status&sslmode=prefer');
  });

  it('returns a non-URL string unchanged', () => {
    expect(withDefaultSslMode('not a url')).toBe('not a url');
  });
});
