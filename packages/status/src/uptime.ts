import postgres from 'postgres';

/** One source's checks on one calendar day (Europe/Brussels). */
export interface DayRow {
  monitor: string;
  day: string;
  checks: number;
  ok: number;
  avgMs: number | null;
}

/** One source's checks over the last 24 hours and 7 days. */
export interface WindowRow {
  monitor: string;
  checks24h: number;
  ok24h: number;
  checks7d: number;
  ok7d: number;
}

export interface LatestCheck {
  observedAt: string;
  success: boolean;
  responseTimeMs: number;
}

/** One check of one source, for the detail of a day. */
export interface DayCheck {
  observedAt: string;
  success: boolean;
  responseTimeMs: number;
  /** What went wrong, as the monitor noted it; null for a check that succeeded. */
  errorMessage: string | null;
}

/** A calendar day as a status page asks for it: 2026-11-20. */
export const isDay = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export interface MonitoredSource {
  uri: string;
  name: Record<string, string>;
  endpoint: string;
}

export interface UptimeDay {
  date: string;
  checks: number;
  ok: number;
  /** Share of successful checks that day, 0 to 1. */
  uptime: number;
  avgResponseTimeMs: number | null;
}

export interface SourceUptime extends MonitoredSource {
  latest: LatestCheck | null;
  /** Share of successful checks, 0 to 1; null when the source was not checked in that window. */
  uptime: {
    last24h: number | null;
    last7d: number | null;
    period: number | null;
  };
  checks: number;
  measuredSince: string | null;
  days: UptimeDay[];
}

export interface UptimeSummary {
  generatedAt: string;
  days: number;
  pollingIntervalSeconds: number;
  measuredSince: string | null;
  uptime: {
    last24h: number | null;
    last7d: number | null;
    period: number | null;
  };
  sources: SourceUptime[];
}

const share = (ok: number, checks: number): number | null =>
  checks > 0 ? ok / checks : null;

/**
 * Turn the per-day and per-window counts into the summary a status page shows: per source the
 * uptime over the last 24 hours, 7 days and the whole period, and one entry per day that has
 * checks. Days without checks are left out, so a page can tell "not measured" from "down".
 */
export function summarize(input: {
  sources: MonitoredSource[];
  dayRows: DayRow[];
  windowRows: WindowRow[];
  latest: Map<string, LatestCheck>;
  days: number;
  pollingIntervalSeconds: number;
  now: Date;
}): UptimeSummary {
  const windows = new Map(input.windowRows.map((row) => [row.monitor, row]));
  const sources = input.sources.map((source): SourceUptime => {
    const rows = input.dayRows
      .filter((row) => row.monitor === source.uri)
      .sort((a, b) => a.day.localeCompare(b.day));
    const checks = rows.reduce((sum, row) => sum + row.checks, 0);
    const ok = rows.reduce((sum, row) => sum + row.ok, 0);
    const window = windows.get(source.uri);
    return {
      ...source,
      latest: input.latest.get(source.uri) ?? null,
      uptime: {
        last24h: window ? share(window.ok24h, window.checks24h) : null,
        last7d: window ? share(window.ok7d, window.checks7d) : null,
        period: share(ok, checks),
      },
      checks,
      measuredSince: rows[0]?.day ?? null,
      days: rows.map((row) => ({
        date: row.day,
        checks: row.checks,
        ok: row.ok,
        uptime: row.checks > 0 ? row.ok / row.checks : 0,
        avgResponseTimeMs: row.avgMs,
      })),
    };
  });

  const total = (pick: (row: WindowRow) => [number, number]) => {
    let ok = 0;
    let checks = 0;
    for (const row of input.windowRows) {
      const [rowOk, rowChecks] = pick(row);
      ok += rowOk;
      checks += rowChecks;
    }
    return share(ok, checks);
  };
  const first = sources
    .map((source) => source.measuredSince)
    .filter((day): day is string => day !== null)
    .sort()[0];

  return {
    generatedAt: input.now.toISOString(),
    days: input.days,
    pollingIntervalSeconds: input.pollingIntervalSeconds,
    measuredSince: first ?? null,
    uptime: {
      last24h: total((row) => [row.ok24h, row.checks24h]),
      last7d: total((row) => [row.ok7d, row.checks7d]),
      period: share(
        sources.reduce(
          (sum, source) =>
            sum + source.days.reduce((inner, day) => inner + day.ok, 0),
          0,
        ),
        sources.reduce((sum, source) => sum + source.checks, 0),
      ),
    },
    sources,
  };
}

/**
 * Reads the check history from the observations table the monitor writes (see
 * `@lde/distribution-monitor`): `observed_at` is a timestamp without time zone holding UTC.
 */
export class UptimeReader {
  private readonly sql: postgres.Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, {
      max: 2,
      idle_timeout: 30,
      connection: { statement_timeout: 20_000 },
    });
  }

  async dayRows(days: number): Promise<DayRow[]> {
    const rows = await this.sql<DayRow[]>`
      select
        monitor,
        to_char((observed_at at time zone 'UTC') at time zone 'Europe/Brussels', 'YYYY-MM-DD') as day,
        count(*)::int as checks,
        (count(*) filter (where success))::int as ok,
        (round(avg(response_time_ms) filter (where success)))::int as "avgMs"
      from observations
      where observed_at >= (now() at time zone 'UTC') - make_interval(days => ${days})
      group by 1, 2
      order by 1, 2
    `;
    return [...rows];
  }

  async windowRows(): Promise<WindowRow[]> {
    const rows = await this.sql<WindowRow[]>`
      select
        monitor,
        (count(*) filter (where observed_at >= (now() at time zone 'UTC') - interval '24 hours'))::int as "checks24h",
        (count(*) filter (where success and observed_at >= (now() at time zone 'UTC') - interval '24 hours'))::int as "ok24h",
        count(*)::int as "checks7d",
        (count(*) filter (where success))::int as "ok7d"
      from observations
      where observed_at >= (now() at time zone 'UTC') - interval '7 days'
      group by 1
    `;
    return [...rows];
  }

  /** Every check of one source on one calendar day (Europe/Brussels), oldest first. */
  async dayChecks(monitor: string, day: string): Promise<DayCheck[]> {
    const rows = await this.sql<DayCheck[]>`
      select
        to_char(observed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "observedAt",
        success,
        response_time_ms as "responseTimeMs",
        left(error_message, 300) as "errorMessage"
      from observations
      where monitor = ${monitor}
        and observed_at >= (${day}::date::timestamp at time zone 'Europe/Brussels') at time zone 'UTC'
        and observed_at < ((${day}::date + 1)::timestamp at time zone 'Europe/Brussels') at time zone 'UTC'
      order by observed_at
    `;
    return [...rows];
  }

  async close(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}
