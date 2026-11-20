import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/query',
  plugins: [],
  test: {
    watch: false,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      enabled: true,
      reporter: ['text'],
      provider: 'v8' as const,
      thresholds: {
        autoUpdate: true,
        // Lowered by a fraction when the fully covered result-type filter was removed
        // (mayProvideResultTypes, matchesResultTypes): less covered code, no new uncovered code.
        lines: 89.78,
        functions: 83.44,
        branches: 79.11,
        statements: 89.64,
      },
    },
  },
}));
