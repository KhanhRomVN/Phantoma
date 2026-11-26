import type { IpInfo } from '@renderer/services/ip-lookup.service';
import type { BrowserKind, BrowserSession, SessionFootprint } from '../../types';
import { request } from '../client';

export const sessionsApi = {
  list: (profileId: string) => request<BrowserSession[]>('GET', `/profiles/${profileId}/sessions`),
  start: (
    profileId: string,
    input: { browser: BrowserKind; ip?: IpInfo | null; footprint?: SessionFootprint | null },
  ) => request<BrowserSession>('POST', `/profiles/${profileId}/sessions`, input),
  update: (
    profileId: string,
    id: string,
    input: { ip?: IpInfo | null; footprint?: SessionFootprint | null },
  ) => request<BrowserSession>('PUT', `/profiles/${profileId}/sessions/${id}`, input),
  end: (profileId: string, id: string) =>
    request<BrowserSession>('POST', `/profiles/${profileId}/sessions/${id}/end`),
  remove: (profileId: string, id: string) =>
    request<{ deleted: boolean }>('DELETE', `/profiles/${profileId}/sessions/${id}`),
};
