// HTTP Status codes configuration
export const STATUS_CODE_GROUPS = {
  informational: [100, 101, 102, 103],
  success: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226],
  redirect: [300, 301, 302, 303, 304, 305, 306, 307, 308],
  clientError: [400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451],
  serverError: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511],
} as const;

export const DEFAULT_STATUS_FILTER = {
  200: true,
  201: true,
  202: true,
  204: true,
  206: true,
  301: true,
  302: true,
  304: true,
  307: true,
  308: true,
  400: true,
  401: true,
  403: true,
  404: true,
  405: true,
  409: true,
  422: true,
  429: true,
  500: true,
  501: true,
  502: true,
  503: true,
  504: true,
  505: true,
};

export type StatusCodeGroup = keyof typeof STATUS_CODE_GROUPS;

export const STATUS_GROUP_LABELS: Record<StatusCodeGroup, string> = {
  informational: '1xx',
  success: '2xx',
  redirect: '3xx',
  clientError: '4xx',
  serverError: '5xx',
};

export const STATUS_GROUP_COLORS: Record<StatusCodeGroup, string> = {
  informational: 'text-blue-400',
  success: 'text-emerald-400',
  redirect: 'text-amber-400',
  clientError: 'text-red-400',
  serverError: 'text-rose-400',
};

export function getStatusGroup(code: number): StatusCodeGroup | null {
  if (code >= 100 && code < 200) return 'informational';
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'clientError';
  if (code >= 500 && code < 600) return 'serverError';
  return null;
}

export function getStatusColorClass(code: number): string {
  const group = getStatusGroup(code);
  if (!group) return 'text-text-secondary';
  return STATUS_GROUP_COLORS[group];
}