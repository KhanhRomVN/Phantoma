import type { BrowsingEntry, DeviceActivity, NetworkFootprint, ScriptRun } from '../../types';
import { request } from '../client';

function childApi<T, I>(parent: string, collection: string) {
  return {
    list: (profileId: string) => request<T[]>('GET', `/profiles/${profileId}/${collection}`),
    create: (profileId: string, input: I) =>
      request<T>('POST', `/profiles/${profileId}/${collection}`, input),
    update: (id: string, input: Partial<I>) => request<T>('PUT', `/${collection}/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/${collection}/${id}`),
    parent,
  };
}

export const footprintsApi = childApi<NetworkFootprint, Partial<NetworkFootprint> & { ip: string }>(
  'profiles',
  'footprints',
);
export const activityApi = childApi<BrowsingEntry, Partial<BrowsingEntry> & { url: string }>('profiles', 'activity');
export const scriptsApi = childApi<ScriptRun, Partial<ScriptRun> & { scriptName: string }>('profiles', 'scripts');
export const devicesApi = childApi<DeviceActivity, Partial<DeviceActivity> & { device: string }>(
  'profiles',
  'devices',
);
