export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
  'TRACE',
  'CONNECT',
] as const;

export type HttpMethod = typeof HTTP_METHODS[number];

export const HTTP_METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  POST: 'text-green-400 bg-green-500/10 border-green-500/30',
  PUT: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
  PATCH: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  HEAD: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  OPTIONS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  TRACE: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  CONNECT: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

export const HTTP_METHOD_ORDER = {
  GET: 1,
  POST: 2,
  PUT: 3,
  DELETE: 4,
  PATCH: 5,
  HEAD: 6,
  OPTIONS: 7,
  TRACE: 8,
  CONNECT: 9,
};