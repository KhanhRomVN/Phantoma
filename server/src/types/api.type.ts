/** Envelope JSON chuẩn của toàn bộ REST API. */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
