import type { StartupTask } from '../startup.runner';

export function createMigrateLegacyServiceEmailsTask(deps: { migrate: () => void }): StartupTask {
  return {
    name: 'migrate-legacy-service-emails',
    phase: 'before-listen',
    run: () => deps.migrate(),
  };
}