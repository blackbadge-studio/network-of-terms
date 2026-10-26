#!/usr/bin/env node
/**
 * Runs the Vlaams Termennetwerk acceptance scenarios against a running API (and UI).
 *
 *   npm run test:scenarios -- --api https://… --ui https://… [--area lookup] [--id API-11]
 *
 * Writes test-results/scenarios.json and test-results/scenarios.junit.xml; exits 1 on any
 * failure or error, so CI can gate on it.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runScenarios,
  summarize,
} from '../packages/graphql/scenarios/runner.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (pairs, arg, i, all) =>
        arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs,
      [],
    ),
);
const api = args.api ?? process.env.VTN_API_URL ?? 'http://localhost:3123';
const ui = args.ui ?? process.env.VTN_UI_URL;
const { scenarios } = JSON.parse(
  readFileSync(join(root, 'packages/graphql/scenarios/scenarios.json'), 'utf8'),
);
const selected = scenarios.filter(
  (s) => (!args.area || s.area === args.area) && (!args.id || s.id === args.id),
);

const icon = { pass: '✓', fail: '✗', error: '!', skipped: '–' };
console.log(
  `Vlaams Termennetwerk – ${selected.length} scenario's tegen ${api}${ui ? ` en ${ui}` : ''}\n`,
);
const results = await runScenarios(selected, {
  api,
  ui,
  onResult: (r) => {
    console.log(
      `${icon[r.status]} ${r.id.padEnd(7)} ${String(r.ms).padStart(5)} ms  ${r.title}`,
    );
    for (const c of r.checks.filter((c) => !c.ok))
      console.log(
        `      ✗ ${c.label}\n        verwacht ${c.expected}, kreeg ${c.actual}`,
      );
    if (r.error) console.log(`      ! ${r.error}`);
  },
});
const s = summarize(results);
console.log(
  `\n${s.pass} geslaagd, ${s.fail} gefaald, ${s.error} fout, ${s.skipped} overgeslagen – ${(s.ms / 1000).toFixed(1)} s`,
);

mkdirSync(join(root, 'test-results'), { recursive: true });
writeFileSync(
  join(root, 'test-results/scenarios.json'),
  JSON.stringify(
    { api, ui, ranAt: new Date().toISOString(), summary: s, results },
    null,
    2,
  ),
);
const esc = (t) =>
  String(t ?? '').replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c],
  );
writeFileSync(
  join(root, 'test-results/scenarios.junit.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="vlaams-termennetwerk" tests="${s.total}" failures="${s.fail}" errors="${s.error}" skipped="${s.skipped}" time="${s.ms / 1000}">\n` +
    results
      .map(
        (r) =>
          `  <testcase classname="${esc(r.area)}" name="${esc(r.id + ' ' + r.title)}" time="${r.ms / 1000}">` +
          (r.status === 'fail'
            ? `<failure message="${esc(
                r.checks
                  .filter((c) => !c.ok)
                  .map((c) => c.label)
                  .join('; '),
              )}"/>`
            : '') +
          (r.status === 'error' ? `<error message="${esc(r.error)}"/>` : '') +
          (r.status === 'skipped' ? '<skipped/>' : '') +
          '</testcase>',
      )
      .join('\n') +
    '\n</testsuite>\n',
);
process.exitCode = s.fail + s.error > 0 ? 1 : 0;
