/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Used here to validate that statutory legal/entity details are explicitly configured in
 * production, so the imprint/legal pages never silently ship built-in placeholder defaults.
 */
export async function register() {
  // Only run in the Node.js server runtime (not the Edge runtime).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const isProduction =
    process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const { validateProductionLegalCompliance } = await import('./lib/legal/config');
  const result = validateProductionLegalCompliance(process.env);

  if (!result.valid) {
    console.warn(
      `[legal-compliance] Production is missing verified legal entity env vars: ` +
        `${result.missingFields.join(', ')}. The imprint/legal pages are falling back to ` +
        `built-in placeholder defaults — set these to your verified corporate details before launch.`,
    );
  }
}
