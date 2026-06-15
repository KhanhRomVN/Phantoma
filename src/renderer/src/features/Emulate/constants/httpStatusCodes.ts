export const HTTP_STATUS_CODES = {
  // 1xx Informational
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',

  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',

  // 3xx Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  // 4xx Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: 'I\'m a teapot',
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',

  // 5xx Server Error
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
} as const;

export type HttpStatusCode = keyof typeof HTTP_STATUS_CODES;

export function getStatusText(code: number): string {
  return HTTP_STATUS_CODES[code as HttpStatusCode] || 'Unknown';
}

export function isSuccessStatus(code: number): boolean {
  return code >= 200 && code < 300;
}

export function isRedirectStatus(code: number): boolean {
  return code >= 300 && code < 400;
}

export function isClientErrorStatus(code: number): boolean {
  return code >= 400 && code < 500;
}

export function isServerErrorStatus(code: number): boolean {
  return code >= 500 && code < 600;
}

export const DEFAULT_STATUS_FILTERS = {
  200: true, 201: true, 202: true, 204: true, 206: true,
  301: true, 302: true, 304: true, 307: true, 308: true,
  400: true, 401: true, 403: true, 404: true, 405: true, 409: true, 422: true, 429: true,
  500: true, 501: true, 502: true, 503: true, 504: true, 505: true,
};