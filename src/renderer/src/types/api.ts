/**
 * Shared API types between frontend and backend.
 * These types are used by both the renderer and main processes.
 */

// ── Base Response ────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
