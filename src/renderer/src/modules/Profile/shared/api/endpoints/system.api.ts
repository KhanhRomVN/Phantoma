import type { ImportFileResult, ImportFolderPreview, SourcePreview } from '../../types';
import { request } from '../client';
import { resolveProfileBaseUrl } from '../profile-base-url';

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${await resolveProfileBaseUrl()}/health`);
    return res.ok;
  } catch {
    return false;
  }
};

export const systemApi = {
  validateFolder: (path: string) =>
    request<{ valid: boolean; reason?: string }>('POST', '/system/validate-folder', { path }),
  previewSource: (path: string) => request<SourcePreview>('POST', '/system/preview-source', { path }),
  previewImportFolder: (path: string) =>
    request<ImportFolderPreview>('POST', '/system/preview-import-folder', { path }),
  readImportFile: (path: string) => request<ImportFileResult>('POST', '/system/read-import-file', { path }),
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
};
