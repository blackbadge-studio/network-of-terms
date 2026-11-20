import { describe, it, expect } from 'vitest';
import { isDay, summarize } from '../src/uptime.js';

const sources = [
  {
    uri: 'https://example.org/a',
    name: { nl: 'Bron A' },
    endpoint: 'https://a.example.org/sparql',
  },
  {
    uri: 'https://example.org/b',
    name: { nl: 'Bron B' },
    endpoint: 'https://b.example.org/sparql',
  },
];

describe('summarize', () => {
  const summary = summarize({
    sources,
    dayRows: [
      {
        monitor: 'https://example.org/a',
        day: '2026-11-02',
        checks: 288,
        ok: 288,
        avgMs: 120,
      },
      {
        monitor: 'https://example.org/a',
        day: '2026-11-01',
        checks: 288,
        ok: 144,
        avgMs: 300,
      },
    ],
    windowRows: [
      {
        monitor: 'https://example.org/a',
        checks24h: 288,
        ok24h: 288,
        checks7d: 576,
        ok7d: 432,
      },
    ],
    latest: new Map([
      [
        'https://example.org/a',
        {
          observedAt: '2026-11-02T12:00:00.000Z',
          success: true,
          responseTimeMs: 110,
        },
      ],
    ]),
    days: 90,
    pollingIntervalSeconds: 300,
    now: new Date('2026-11-02T12:01:00Z'),
  });

  it('gives a source its uptime per window and its days in order', () => {
    const a = summary.sources[0];
    expect(a.uptime).toEqual({ last24h: 1, last7d: 0.75, period: 0.75 });
    expect(a.days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(a.days[0]).toMatchObject({ uptime: 0.5, avgResponseTimeMs: 300 });
    expect(a.measuredSince).toBe('2026-11-01');
    expect(a.latest?.success).toBe(true);
  });

  it('keeps a source without checks apart from a source that is down', () => {
    const b = summary.sources[1];
    expect(b.uptime).toEqual({ last24h: null, last7d: null, period: null });
    expect(b.days).toEqual([]);
    expect(b.latest).toBeNull();
  });

  it('adds up all sources for the overall figures', () => {
    expect(summary.uptime).toEqual({ last24h: 1, last7d: 0.75, period: 0.75 });
    expect(summary.measuredSince).toBe('2026-11-01');
  });
});

describe('isDay', () => {
  it('accepts a calendar day and nothing else', () => {
    expect(isDay('2026-11-20')).toBe(true);
    expect(isDay('2026-13-40')).toBe(false);
    expect(isDay('20 november')).toBe(false);
    expect(isDay("2026-11-20'; drop table observations")).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
});
