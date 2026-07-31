// HTTP methods configuration
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

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-indigo-400',
  OPTIONS: 'text-teal-400',
  TRACE: 'text-pink-400',
  CONNECT: 'text-violet-400',
};

export const METHOD_BADGE_COLORS: Record<HttpMethod, { text: string; bg: string; border: string }> =
  {
    GET: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/20',
    },
    POST: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/20',
    },
    PUT: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/20',
    },
    DELETE: {
      text: 'text-red-400',
      bg: 'bg-red-500/15',
      border: 'border-red-500/20',
    },
    PATCH: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/20',
    },
    HEAD: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/15',
      border: 'border-indigo-500/20',
    },
    OPTIONS: {
      text: 'text-teal-400',
      bg: 'bg-teal-500/15',
      border: 'border-teal-500/20',
    },
    TRACE: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/15',
      border: 'border-pink-500/20',
    },
    CONNECT: {
      text: 'text-violet-400',
      bg: 'bg-violet-500/15',
      border: 'border-violet-500/20',
    },
  };

export const DEFAULT_METHOD = 'GET';