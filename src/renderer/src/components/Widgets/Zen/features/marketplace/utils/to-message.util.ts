export const toMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;