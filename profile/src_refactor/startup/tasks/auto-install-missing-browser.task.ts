import { createLogger } from '../../utils/logger';
import type { StartupTask } from '../startup.runner';

const logger = createLogger('Startup');

export function createAutoInstallMissingBrowserTask(deps: { autoInstallIfMissing: () => Promise<void> }): StartupTask {
  return {
    name: 'auto-install-missing-browser',
    phase: 'after-listen',
    run: async () => {
      try {
        await deps.autoInstallIfMissing();
      } catch (err) {
        logger.warn('Auto-install browser failed', err);
      }
    },
  };
}