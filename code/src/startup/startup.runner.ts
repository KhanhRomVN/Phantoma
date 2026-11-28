export interface StartupTask {
  failureMessage: string;
  run(): Promise<unknown>;
}

export async function runStartupTasks(tasks: StartupTask[]): Promise<void> {
  for (const task of tasks) {
    try {
      await task.run();
    } catch (err) {
      console.warn(task.failureMessage, err);
    }
  }
}