import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    maxWorkers: 1,
    testTimeout: 5_000,
  },
});
