import { request } from '../../../../shared/api/proxy-http-client';
import type { Proxy } from '../../../../shared/types/proxy-domain.types';
import type { WarpCreateInput } from './warp.types';

export const warpApi = {
  create: (input: WarpCreateInput) =>
    request<{ created: Proxy[]; errors: string[] }>('POST', '/warp/proxies', input),
  start: (id: string) => request<Proxy>('POST', `/warp/proxies/${id}/start`, {}),
  stop: (id: string) => request<Proxy>('POST', `/warp/proxies/${id}/stop`),
};
