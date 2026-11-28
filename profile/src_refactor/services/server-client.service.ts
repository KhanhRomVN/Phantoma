import { getConfig } from '../config/server.config';

export const serverClient = {
  forkPath: async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`${getConfig().serverUrl}/api/v1/browser/forks/${encodeURIComponent(id)}/path`);
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: { path?: string | null } };
      return body.data?.path ?? null;
    } catch {
      return null;
    }
  },
};