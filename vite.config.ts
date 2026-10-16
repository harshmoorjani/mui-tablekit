import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'demo-dist',
    // The demo is entirely client-side; the published tsc output keeps directives.
    rolldownOptions: { checks: { moduleLevelDirective: false } },
  },
  test: { environment: 'jsdom', setupFiles: ['tests/setup.ts'] },
});
