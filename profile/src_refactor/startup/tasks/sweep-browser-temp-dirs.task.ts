import type { StartupTask } from '../startup.runner';

export function createSweepBrowserTempDirsTask(deps: { sweepTempDirs: () => void }): StartupTask {
  return {
    name: 'sweep-browser-temp-dirs',
    phase: 'before-listen',
    run: () => deps.sweepTempDirs(),
  };
}