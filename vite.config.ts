import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { outDir: 'demo-dist' },
  test: { environment: 'jsdom', setupFiles: ['tests/setup.ts'] },
});
