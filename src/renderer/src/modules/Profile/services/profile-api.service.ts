import type { IpInfo } from '@renderer/services/ip-lookup.service';
import type {
  BrowserSession,
  BrowsingEntry,
  DeviceActivity,
  NetworkFootprint,
  Profile,
  ProfileSource,
  ScriptRun,
  ServiceLink,
  ServiceTemplate,
  SessionFootprint,
} from '../types';
import { resolveProfileBaseUrl } from './profile-base-url';

export type BrowserKind = 'chrome' | 'chromium';

export type SavedQueryRecord = import('../utils/queryBuilder').SavedQuery & { text: string };
export type SavedQueryInput = Omit<SavedQueryRecord, 'id'> & { id?: string };

export type SourceInput = Partial<Omit<ProfileSource, 'id' | 'count'>>;
export type ProfileInput = Partial<
  Omit<Profile, 'id' | 'services' | 'footprints' | 'browsing' | 'scripts' | 'devices'>
>;
export type ServiceLinkInput = Partial<Omit<ServiceLink, 'linkedAt' | 'statusNote' | 'templateId'>> & {
  name: string;
  statusNote?: string | null;
  templateId?: string | null;
};
export type ServiceTemplateInput = Partial<ServiceTemplate> & { name: string };

export type ConflictLevel = 'identical' | 'mergeable' | 'conflict';

export interface TransferPlanItem {
  id: string;
  email: string;
  oldFolder: string;
  newFolder: string;
  folderRule: 'email' | 'chrome';
  blocked: string | null;
  conflict: {
    targetId: string;
    targetFolder: string;
    level: ConflictLevel;
    fillable: string[];
    differing: string[];
  } | null;
}

export interface TransferOutcome {
  transferred: number;
  merged: number;
  skipped: number;
  failed: { id: string; email: string; error: string }[];
}

export type TransferPhase = 'scanning' | 'running' | 'done' | 'cancelled' | 'error';
export type TransferItemState = 'pending' | 'active' | 'transferred' | 'merged' | 'skipped' | 'failed';

export interface TransferJobItem {
  id: string;
  email: string;
  bytes: number;
  state: TransferItemState;
  error?: string;
}

export interface TransferJob {
  id: string;
  mode: 'move' | 'duplicate';
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: TransferJobItem[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

export interface SourcePreviewProfile {
  folder: string;
  email: string | null;
  name: string;
  hasEmail: boolean;
  synced: boolean;
}

export interface SourcePreview {
  valid: boolean;
  reason?: string;
  total: number;
  withEmail: number;
  profiles: SourcePreviewProfile[];
}

export interface ImportFolderRow {
  folder: string;
  email: string | null;
  sync: 'synced' | 'unsynced' | 'error';
}

export interface ImportFolderPreview {
  valid: boolean;
  reason?: string;
  container: boolean;
  rows: ImportFolderRow[];
}

export interface ImportBackupRow {
  email: string;
  displayName: string | null;
  recoveryEmail: string | null;
  phone: string | null;
  totp: string | null;
  backupCodes: string[];
  services: number;
}

export type ImportFileResult = { kind: 'text'; text: string } | { kind: 'backup'; rows: ImportBackupRow[] };

export interface ImportJob {
  id: string;
  phase: TransferPhase;
  totalBytes: number;
  doneBytes: number;
  items: TransferJobItem[];
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
}

export interface FolderInfo {
  path: string;
  exists: boolean;
  launch: { userDataDir: string; profileDirectory: string | null };
  browsers: Record<BrowserKind, { path: string; exists: boolean; launched: boolean }>;
}

export interface RunningBrowser {
  emailId: string;
  browser: BrowserKind;
  pid: number;
  startedAt: string;
  sessionId: string;
  external?: boolean;
}

export interface LaunchInput {
  browser: BrowserKind;
  url?: string;
  proxyServer?: string;
  forkId?: string;
  ip?: IpInfo | null;
  footprint?: SessionFootprint | null;
}

export type ForkInstallPhase = 'checking' | 'downloading' | 'extracting' | 'error';

export interface ForkInstallJob {
  version: string;
  phase: ForkInstallPhase;
  progress: number;
  error: string | null;
}

export interface ForkUpdateInfo {
  id: string;
  name: string;
  supported: boolean;
  versions: { version: string | null; path: string; current: boolean }[];
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  checkError: string | null;
  job: ForkInstallJob | null;
}

export interface SavedPassword {
  id: string;
  url: string;
  username: string;
  password: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${await resolveProfileBaseUrl()}/api/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Profile server error (HTTP ${res.status})`);
  }
  return payload.data as T;
}

const browserQuery = (browser?: BrowserKind): string => (browser ? `?browser=${browser}` : '');

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

export const profileApi = {
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${await resolveProfileBaseUrl()}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  sources: {
    list: () => request<ProfileSource[]>('GET', '/sources'),
    create: (input: SourceInput & { name: string }) =>
      request<ProfileSource>('POST', '/sources', input),
    update: (id: string, input: SourceInput) =>
      request<ProfileSource>('PUT', `/sources/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/sources/${id}`),
    import: (input: { name?: string; location: string }) =>
      request<ProfileSource>('POST', '/sources/import', input),
    sync: (id: string) =>
      request<{ found: number; created: number; skipped: number }>('POST', `/sources/${id}/sync`),
  },

  profiles: {
    list: (opts: { sourceId?: string; full?: boolean } = {}) => {
      const q = new URLSearchParams();
      if (opts.sourceId) q.set('sourceId', opts.sourceId);
      if (opts.full) q.set('full', 'true');
      const qs = q.toString();
      return request<Profile[]>('GET', `/profiles${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<Profile>('GET', `/profiles/${id}?full=true`),
    create: (input: ProfileInput & { sourceId: string; email: string }) =>
      request<Profile>('POST', '/profiles', input),
    createMany: (profiles: (ProfileInput & { sourceId: string; email: string })[]) =>
      request<Profile[]>('POST', '/profiles/bulk', { profiles }),
    update: (id: string, input: ProfileInput) =>
      request<Profile>('PUT', `/profiles/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/profiles/${id}`),
    removeMany: (ids: string[]) =>
      request<{ deleted: number }>('POST', '/profiles/bulk-delete', { ids }),
    updateMany: (
      target: { ids: string[] } | { where: { group: string } },
      patch: ProfileInput,
    ) => request<{ updated: number }>('POST', '/profiles/bulk-update', { ...target, patch }),
    transfer: (input: {
      ids: string[];
      targetId: string;
      mode: 'move' | 'duplicate';
      policy: string;
      policies?: Record<string, string>;
    }) =>
      request<TransferOutcome>('POST', '/profiles/transfer', input),
    transferPreview: (ids: string[], targetId: string) =>
      request<TransferPlanItem[]>('POST', '/profiles/transfer/preview', { ids, targetId }),
    transferJob: {
      start: (input: {
        ids: string[];
        targetId: string;
        mode: 'move' | 'duplicate';
        policy: string;
        policies?: Record<string, string>;
      }) => request<TransferJob>('POST', '/profiles/transfer/jobs', input),
      get: (id: string) => request<TransferJob>('GET', `/profiles/transfer/jobs/${id}`),
      cancel: (id: string) => request<TransferJob>('POST', `/profiles/transfer/jobs/${id}/cancel`),
    },
    importJob: {
      start: (input: { path: string; targetId: string; folders: string[] }) =>
        request<ImportJob>('POST', '/profiles/import/jobs', input),
      get: (id: string) => request<ImportJob>('GET', `/profiles/import/jobs/${id}`),
      cancel: (id: string) => request<ImportJob>('POST', `/profiles/import/jobs/${id}/cancel`),
    },
    openFolder: (id: string) => request<{ path: string }>('POST', `/profiles/${id}/open-folder`),
  },

  system: {
    validateFolder: (path: string) =>
      request<{ valid: boolean; reason?: string }>('POST', '/system/validate-folder', { path }),
    previewSource: (path: string) => request<SourcePreview>('POST', '/system/preview-source', { path }),
    previewImportFolder: (path: string) =>
      request<ImportFolderPreview>('POST', '/system/preview-import-folder', { path }),
    readImportFile: (path: string) => request<ImportFileResult>('POST', '/system/read-import-file', { path }),
    passwordReuse: (password: string) => request<{ count: number }>('POST', '/passwords/reuse', { password }),
    deviceFingerprint: () =>
      request<{
        family: 'windows' | 'macos' | 'linux';
        os: string;
        browser: string;
        gpu: string;
        cores: number;
        memory: number;
        lang: string;
        tz: string;
        cc: string;
      }>('GET', '/system/device-fingerprint'),
    syncSources: (sourceId?: string) =>
      request<{ sourceId: string; found: number; created: number; skipped: number }[]>(
        'POST',
        `/sources/sync${sourceId ? `?sourceId=${encodeURIComponent(sourceId)}` : ''}`,
      ),
  },

  services: {
    list: () => request<ServiceTemplate[]>('GET', '/services'),
    create: (input: ServiceTemplateInput) => request<ServiceTemplate>('POST', '/services', input),
    update: (id: string, input: Partial<ServiceTemplateInput>) =>
      request<ServiceTemplate>('PUT', `/services/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/services/${id}`),
  },

  serviceEmails: {
    list: (profileId: string) => request<ServiceLink[]>('GET', `/profiles/${profileId}/service-emails`),
    create: (profileId: string, input: ServiceLinkInput) =>
      request<ServiceLink>('POST', `/profiles/${profileId}/service-emails`, input),
    update: (profileId: string, id: string, input: Partial<ServiceLinkInput>) =>
      request<ServiceLink>('PUT', `/profiles/${profileId}/service-emails/${id}`, input),
    remove: (profileId: string, id: string) =>
      request<{ deleted: boolean }>('DELETE', `/profiles/${profileId}/service-emails/${id}`),
  },
  sessions: {
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
  },
  queries: {
    list: () => request<SavedQueryRecord[]>('GET', '/queries'),
    create: (input: SavedQueryInput) => request<SavedQueryRecord>('POST', '/queries', input),
    update: (id: string, input: Partial<SavedQueryInput>) =>
      request<SavedQueryRecord>('PUT', `/queries/${id}`, input),
    remove: (id: string) => request<{ deleted: boolean }>('DELETE', `/queries/${id}`),
  },
  footprints: childApi<NetworkFootprint, Partial<NetworkFootprint> & { ip: string }>(
    'profiles',
    'footprints',
  ),
  activity: childApi<BrowsingEntry, Partial<BrowsingEntry> & { url: string }>('profiles', 'activity'),
  scripts: childApi<ScriptRun, Partial<ScriptRun> & { scriptName: string }>('profiles', 'scripts'),
  devices: childApi<DeviceActivity, Partial<DeviceActivity> & { device: string }>(
    'profiles',
    'devices',
  ),

  browser: {
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
  },
};