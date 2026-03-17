/**
 * Next.js instrumentation hook — runs once when the server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  const { checkEnvironment } = await import("@/lib/env-check");
  checkEnvironment();
}
