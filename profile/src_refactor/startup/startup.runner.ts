import { createLogger } from '../utils/logger';

const logger = createLogger('Startup');

export type StartupPhase = 'before-listen' | 'after-listen';

export interface StartupTask {
  name: string;
  phase: StartupPhase;
  run: () => void | Promise<void>;
}

export interface StartupRunner {
  run: (phase: StartupPhase) => Promise<void>;
}

export function createStartupRunner(tasks: StartupTask[]): StartupRunner {
  return {
    run: async (phase) => {
      for (const task of tasks.filter((t) => t.phase === phase)) {
        await task.run();
      }
    },
  };
}

export { logger as startupLogger };