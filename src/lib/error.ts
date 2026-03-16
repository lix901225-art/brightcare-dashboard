/**
 * Safely extract a human-readable message from an unknown caught value.
 * Replaces the `catch (e: any) { e?.message }` anti-pattern.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}
