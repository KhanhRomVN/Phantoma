export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Response envelope returned by every Proxy server endpoint. */
export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}
