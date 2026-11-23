import { request } from '../client';

export const prApi = {
  status: (root: string) =>
    request<Record<string, any>>('GET', `/pr/status?root=${encodeURIComponent(root)}`),
  loginToken: (root: string, token: string) =>
    request<{ ok?: boolean; error?: string }>('POST', '/pr/login-token', { root, token }),
  loginWeb: (root: string) =>
    request<{ code?: string; url?: string; error?: string }>('POST', '/pr/login-web', { root }),
  cancelLoginWeb: () => request<{ ok: boolean }>('POST', '/pr/login-web/cancel', {}),
  list: (root: string, state: string, limit: number) =>
    request<{ prs?: any[]; error?: string }>(
      'GET',
      `/pr/list?root=${encodeURIComponent(root)}&state=${encodeURIComponent(state)}&limit=${limit}`,
    ),
  view: (root: string, number: number) =>
    request<{ pr?: any; error?: string }>('GET', `/pr/${number}?root=${encodeURIComponent(root)}`),
  diff: (root: string, number: number) =>
    request<{ diff?: string; error?: string }>('GET', `/pr/${number}/diff?root=${encodeURIComponent(root)}`),
  create: (
    root: string,
    input: { title: string; body?: string; base?: string; head?: string; draft?: boolean; push?: boolean },
  ) => request<{ ok?: boolean; url?: string; error?: string }>('POST', '/pr', { root, ...input }),
  action: (root: string, number: number, verb: string, args: unknown[]) => {
    const bodies: Record<string, (a: unknown[]) => object> = {
      merge: ([method, deleteBranch]) => ({ method, deleteBranch }),
      close: ([comment]) => ({ comment }),
      comment: ([body]) => ({ body }),
      review: ([action, body]) => ({ action, body }),
    };
    return request<{ ok?: boolean; output?: string; error?: string }>('POST', `/pr/${number}/${verb}`, {
      root,
      ...(bodies[verb]?.(args) ?? {}),
    });
  },
};
