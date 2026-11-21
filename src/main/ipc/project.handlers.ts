import { ipcMain } from 'electron';
import { projectStorage } from '../storage/ProjectStorage';
import { logger } from '../utils/logger';

export function setupProjectHandlers(): void {
  ipcMain.handle('project:load', async () => {
    try {
      return {
        success: true,
        projects: projectStorage.loadAll(),
        settings: projectStorage.loadSettings(),
      };
    } catch (err: any) {
      logger.error('[project:load] Error:', err);
      return { success: false, projects: [], settings: {}, error: err?.message };
    }
  });

  ipcMain.handle(
    'project:save',
    async (_event, projects: any[], settings: Record<string, unknown>) => {
      try {
        projectStorage.saveAll(Array.isArray(projects) ? projects : []);
        projectStorage.saveSettings(settings ?? {});
        return { success: true };
      } catch (err: any) {
        logger.error('[project:save] Error:', err);
        return { success: false, error: err?.message };
      }
    },
  );
}