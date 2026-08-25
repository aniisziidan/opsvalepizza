import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Phase 0 deferred vitest config; added here for the Phase 1 auth util test.
// The auth helper test runs in a plain node environment (no JSX/DOM needed).
// When component tests are added later, install @vitejs/plugin-react + switch
// the relevant suites to the jsdom environment.
export default defineConfig({
  resolve: {
    alias: {
      // Mirror the tsconfig `@/*` path alias so imports resolve under Vitest.
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // next-auth imports `next/server` without an extension; Next resolves
      // this via its `exports` map but Node/Vitest's resolver does not, so we
      // point it at the concrete file for tests.
      'next/server': 'next/server.js',
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    server: {
      deps: {
        // Force Vite to transform next-auth so the `next/server` alias above
        // is applied instead of next-auth being externalized to Node's resolver.
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
});
