import { ipcMain } from 'electron';
import { userAppStore, UserApp } from '../store/apps';
import { activeTargetStore, ActiveTargetTab } from '../store/active-targets';
import { scanInstalledApps } from '../utils/app-scanner';

export function setupAppsHandlers() {
  // User Apps IPC
  ipcMain.handle('apps:get-all', () => {
    return userAppStore.getAllApps();
  });

  ipcMain.handle('apps:create', (_, appData: Omit<UserApp, 'id' | 'createdAt'>) => {
    return userAppStore.addApp(appData);
  });

  // Alias for 'apps:add' to match frontend naming
  ipcMain.handle('apps:add', (_, appData: Omit<UserApp, 'id' | 'createdAt'>) => {
    return userAppStore.addApp(appData);
  });

  ipcMain.handle(
    'apps:update',
    async (_, id: string, updates: Partial<Omit<UserApp, 'id' | 'createdAt'>>) => {
      return userAppStore.updateApp(id, updates);
    },
  );

  ipcMain.handle('apps:delete', (_, id: string) => {
    return userAppStore.deleteApp(id);
  });

  ipcMain.handle('apps:scan-pc', async () => {
    return await scanInstalledApps();
  });

  // Active Targets IPC (for current target UI)
  ipcMain.handle('emulate:get-active-targets', async () => {
    return {
      targets: activeTargetStore.getTargets(),
      activeId: activeTargetStore.getActiveId(),
    };
  });

  ipcMain.handle(
    'emulate:set-active-targets',
    async (_, targets: ActiveTargetTab[], activeId: string | null) => {
      activeTargetStore.setTargets(targets, activeId);
      return { success: true };
    },
  );

  ipcMain.handle('emulate:clear-active-targets', async () => {
    activeTargetStore.clear();
    return { success: true };
  });
}