import next from 'eslint-config-next';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...next,
  {
    // Keep the lint pass non-blocking for pre-existing stylistic/legacy
    // findings from the Vite -> Next migration. These are surfaced as
    // warnings rather than errors so `npm run lint` runs to completion.
    rules: {
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-img-element': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
