/**
 * Standard JSON envelope returned by every API endpoint.
 *   success → { success: true, data }
 *   error   → { success: false, error }
 */

export interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
