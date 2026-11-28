import type {
  BrowserKind,
  FolderInfo,
  ForkUpdateInfo,
  LaunchInput,
  RunningBrowser,
  SavedPassword,
} from '../../types';
import { request } from '../client';

const browserQuery = (browser?: BrowserKind): string => (browser ? `?browser=${browser}` : '');

export const browserApi = {
  executables: () =>
    request<{ kind: BrowserKind; path: string | null }[]>('GET', '/browser/executables'),
  forks: () =>
    request<
      {
        id: string;
        name: string;
        desc: string;
        badge: string;
        tone: string;
        url: string;
        version: string | null;
        path: string | null;
        installed: boolean;
      }[]
    >('GET', '/browser/forks'),
  updates: () => request<ForkUpdateInfo[]>('GET', '/browser/updates'),
  checkUpdates: () => request<ForkUpdateInfo[]>('POST', '/browser/updates/check'),
  installFork: (id: string, version?: string) =>
    request<ForkUpdateInfo>('POST', `/browser/updates/${id}/install`, version ? { version } : {}),
  running: () => request<RunningBrowser[]>('GET', '/browser/running'),
  launch: (profileId: string, input: LaunchInput) =>
    request<RunningBrowser>('POST', `/profiles/${profileId}/launch`, input),
  stop: (profileId: string) => request<RunningBrowser>('POST', `/profiles/${profileId}/stop`),
  folder: (profileId: string) => request<FolderInfo>('GET', `/profiles/${profileId}/folder`),

  avatar: (profileId: string, browser?: BrowserKind) =>
    request<{ avatar: string | null }>(
      'GET',
      `/profiles/${profileId}/avatar${browserQuery(browser)}`,
    ),
  googleLogin: (profileId: string, browser?: BrowserKind) =>
    request<{ loggedIn: boolean; reason: string }>(
      'GET',
      `/profiles/${profileId}/google-login${browserQuery(browser)}`,
    ),
  savedLogins: (profileId: string, browser?: BrowserKind) =>
    request<{ url: string; name: string; username: string }[]>(
      'GET',
      `/profiles/${profileId}/saved-logins${browserQuery(browser)}`,
    ),
  history: (profileId: string, date?: string) =>
    request<{ url: string; title: string; time: number; visits: number }[]>(
      'GET',
      `/profiles/${profileId}/history${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    ),
  passwords: {
    list: (profileId: string) =>
      request<SavedPassword[]>('GET', `/profiles/${profileId}/passwords`),
    add: (profileId: string, input: Omit<SavedPassword, 'id'>) =>
      request<SavedPassword>('POST', `/profiles/${profileId}/passwords`, input),
    update: (profileId: string, id: string, input: Omit<SavedPassword, 'id'>) =>
      request<{ updated: boolean }>('PUT', `/profiles/${profileId}/passwords/${id}`, input),
    remove: (profileId: string, id: string) =>
      request<{ deleted: boolean }>('DELETE', `/profiles/${profileId}/passwords/${id}`),
  },
};
