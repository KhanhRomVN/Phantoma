import { createLogger } from '../../utils/logger';
import type { StartupTask } from '../startup.runner';

const logger = createLogger('Startup');

interface StartupSource {
  id: string;
  name: string;
  type?: string;
  location?: string | null;
}

export interface ReconcileAndSyncDeps {
  reconcile: () => Promise<unknown>;
  list: () => Promise<StartupSource[]>;
  syncSource: (source: { id: string; name: string; location: string }) => Promise<unknown>;
  folderExists: (location: string) => boolean;
}

export function createReconcileAndSyncLocalSourcesTask(deps: ReconcileAndSyncDeps): StartupTask {
  return {
    name: 'reconcile-and-sync-local-sources',
    phase: 'before-listen',
    run: async () => {
      await deps.reconcile();
      const sources = await deps.list();
      if (sources.length === 0) logger.warn('No sources found in database');
      for (const s of sources) {
        const location = s.location ?? '';
        if (location && !deps.folderExists(location)) {
          logger.warn(`Source "${s.name}" folder does not exist: ${location}`);
        } else if (s.type === 'local' && location) {
          await deps.syncSource({ id: s.id, name: s.name, location });
        }
      }
    },
  };
}