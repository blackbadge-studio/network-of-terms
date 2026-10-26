/**
 * Acceptance scenario runner for the Vlaams Termennetwerk.
 *
 * One dependency-free ES module, used by the CLI (`npm run test:scenarios`) and imported by the
 * simulator page in the browser, so both judge a scenario exactly the same way. Scenarios live in
 * scenarios.json next to this file; the API serves both under /tests/.
 *
 * A scenario is `{ id, area, title, requirement, kind: 'graphql' | 'http', checks: [...] }`:
 * - graphql: `query`, optional `variables`, `headers`, `repeat` (runs the request that many times
 *   and checks the last answer, e.g. to see a cache hit).
 * - http: `path`, optional `base` ('api' default, or 'ui'), `method`, `headers`.
 * Checks select values with a small path syntax (`data.terms[*].result.__typename`, `[0]`, `[*]`)
 * and test them: exists, equals, oneOf, contains, notContains, matches, length {min,max},
 * count {min,max}, min/max (numbers), some (any instead of every), plus maxMs, status, header.
 */

export function select(value, path) {
  if (!path) return [value];
  let current = [value];
  for (const part of path.match(/[^.[\]]+|\[\*\]|\[\d+\]/g) ?? []) {
    const next = [];
    for (const item of current) {
      if (item === null || item === undefined) continue;
      if (part === '[*]') {
        if (Array.isArray(item)) next.push(...item);
      } else if (/^\[\d+\]$/.test(part)) {
        const index = Number(part.slice(1, -1));
        if (Array.isArray(item) && index < item.length) next.push(item[index]);
      } else if (typeof item === 'object' && part in item) {
        next.push(item[part]);
      }
    }
    current = next;
  }
  return current;
}

const short = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text === undefined
    ? 'undefined'
    : text.length > 160
      ? text.slice(0, 157) + '…'
      : text;
};

const includes = (value, needle) =>
  Array.isArray(value)
    ? value.some((item) => includes(item, needle))
    : typeof value === 'string'
      ? value.toLowerCase().includes(String(needle).toLowerCase())
      : value === needle;

function evaluate(check, response) {
  const label =
    check.label ??
    [
      check.path ??
        check.count ??
        (check.maxMs !== undefined
          ? 'responstijd'
          : check.status !== undefined
            ? 'HTTP-status'
            : check.header),
      Object.keys(check)
        .filter((key) => !['label', 'path', 'some'].includes(key))
        .map((key) => `${key} ${short(check[key])}`)
        .join(', '),
    ].join(': ');
  if (check.maxMs !== undefined) {
    return {
      label,
      ok: response.ms <= check.maxMs,
      actual: `${response.ms} ms`,
      expected: `≤ ${check.maxMs} ms`,
    };
  }
  if (check.status !== undefined) {
    return {
      label,
      ok: response.status === check.status,
      actual: response.status,
      expected: check.status,
    };
  }
  if (check.header !== undefined) {
    const value = response.headers?.[check.header.toLowerCase()] ?? null;
    const ok =
      check.contains === undefined
        ? value !== null
        : value !== null && includes(value, check.contains);
    return { label, ok, actual: value, expected: check.contains ?? 'aanwezig' };
  }
  if (check.count !== undefined) {
    const n = select(response.body, check.count).length;
    const ok =
      (check.min === undefined || n >= check.min) &&
      (check.max === undefined || n <= check.max);
    return {
      label,
      ok,
      actual: n,
      expected: `${check.min ?? 0}–${check.max ?? '∞'}`,
    };
  }
  const values = select(response.body, check.path);
  if (check.exists !== undefined) {
    const present = values.some(
      (value) => value !== null && value !== undefined,
    );
    return {
      label,
      ok: present === check.exists,
      actual: present ? short(values[0]) : 'afwezig',
      expected: check.exists ? 'aanwezig' : 'afwezig',
    };
  }
  if (check.length !== undefined) {
    const target = values[0];
    const n = Array.isArray(target) ? target.length : -1;
    const ok =
      n >= 0 &&
      (check.length.min === undefined || n >= check.length.min) &&
      (check.length.max === undefined || n <= check.length.max);
    return {
      label,
      ok,
      actual: n < 0 ? short(target) : n,
      expected: `lengte ${check.length.min ?? 0}–${check.length.max ?? '∞'}`,
    };
  }
  const test = (value) => {
    if (check.equals !== undefined)
      return JSON.stringify(value) === JSON.stringify(check.equals);
    if (check.oneOf !== undefined) return check.oneOf.includes(value);
    if (check.contains !== undefined) return includes(value, check.contains);
    if (check.notContains !== undefined)
      return !includes(value, check.notContains);
    if (check.matches !== undefined)
      return new RegExp(check.matches, 'i').test(String(value));
    if (check.min !== undefined || check.max !== undefined)
      return (
        typeof value === 'number' &&
        (check.min === undefined || value >= check.min) &&
        (check.max === undefined || value <= check.max)
      );
    return value !== undefined;
  };
  if (values.length === 0) {
    // notContains over nothing holds; everything else needs at least one value.
    return {
      label,
      ok: check.notContains !== undefined,
      actual: 'geen waarden',
      expected: short(
        check.equals ?? check.oneOf ?? check.contains ?? check.matches ?? '',
      ),
    };
  }
  const ok = check.some ? values.some(test) : values.every(test);
  const failing = check.some ? values : values.filter((value) => !test(value));
  return {
    label,
    ok,
    actual: short(ok ? values.slice(0, 5) : failing.slice(0, 5)),
    expected: short(
      check.equals ??
        check.oneOf ??
        check.contains ??
        check.notContains ??
        check.matches ?? { min: check.min, max: check.max },
    ),
  };
}

async function request(scenario, options) {
  const api = options.api.replace(/\/$/, '');
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const started = (globalThis.performance ?? Date).now();
  let res;
  if (scenario.kind === 'graphql') {
    res = await fetchImpl(api + (scenario.path ?? '/graphql'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Simulation': '1',
        ...(scenario.headers ?? {}),
      },
      body: JSON.stringify({
        query: scenario.query,
        variables: scenario.variables ?? {},
      }),
      signal: options.signal,
    });
  } else {
    const base = scenario.base === 'ui' ? options.ui : api;
    res = await fetchImpl(base.replace(/\/$/, '') + scenario.path, {
      method: scenario.method ?? 'GET',
      headers: { 'X-Simulation': '1', ...(scenario.headers ?? {}) },
      signal: options.signal,
    });
  }
  const text = await res.text();
  const ms = Math.round((globalThis.performance ?? Date).now() - started);
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON (HTML, Turtle, JS): checks then see the raw text.
  }
  const headers = {};
  res.headers.forEach((value, key) => (headers[key] = value));
  return { status: res.status, headers, body, ms };
}

export async function runScenario(scenario, options) {
  const base = {
    id: scenario.id,
    title: scenario.title,
    area: scenario.area,
    requirement: scenario.requirement ?? [],
  };
  if (scenario.base === 'ui' && !options.ui) {
    return {
      ...base,
      status: 'skipped',
      ms: 0,
      checks: [],
      error: 'Geen UI-adres opgegeven',
    };
  }
  try {
    let response;
    for (let i = 0; i < (scenario.repeat ?? 1); i++) {
      response = await request(scenario, options);
    }
    if (scenario.expectError) {
      const message = response.body?.errors?.[0]?.message;
      const checks = [
        {
          label: 'GraphQL geeft een duidelijke fout',
          ok: !!message,
          actual: message ?? 'geen fout',
          expected: 'errors[0].message',
        },
      ];
      return {
        ...base,
        status: message ? 'pass' : 'fail',
        ms: response.ms,
        checks,
      };
    }
    if (scenario.kind === 'graphql' && response.body?.errors?.length) {
      const checks = [
        {
          label: 'GraphQL zonder fouten',
          ok: false,
          actual: short(response.body.errors[0].message),
          expected: 'geen errors',
        },
      ];
      return { ...base, status: 'fail', ms: response.ms, checks };
    }
    const checks = (scenario.checks ?? []).map((check) =>
      evaluate(check, response),
    );
    return {
      ...base,
      status: checks.every((check) => check.ok) ? 'pass' : 'fail',
      ms: response.ms,
      checks,
    };
  } catch (error) {
    if (options.signal?.aborted)
      return {
        ...base,
        status: 'skipped',
        ms: 0,
        checks: [],
        error: 'Gestopt',
      };
    return {
      ...base,
      status: 'error',
      ms: 0,
      checks: [],
      error: String(error?.message ?? error),
    };
  }
}

/** Runs the scenarios one after the other (they share live sources; parallel runs skew timings). */
export async function runScenarios(scenarios, options) {
  const results = [];
  for (const scenario of scenarios) {
    if (options.signal?.aborted) break;
    options.onStart?.(scenario);
    const result = await runScenario(scenario, options);
    results.push(result);
    options.onResult?.(result);
  }
  return results;
}

export function summarize(results) {
  const count = (status) =>
    results.filter((result) => result.status === status).length;
  const areas = {};
  for (const result of results) {
    areas[result.area] ??= { pass: 0, fail: 0, error: 0, skipped: 0 };
    areas[result.area][result.status]++;
  }
  return {
    total: results.length,
    pass: count('pass'),
    fail: count('fail'),
    error: count('error'),
    skipped: count('skipped'),
    ms: results.reduce((sum, result) => sum + result.ms, 0),
    areas,
  };
}
