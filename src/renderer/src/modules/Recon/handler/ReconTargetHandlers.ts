import { useReconStore, type ReconTarget } from '../stores/useReconStore';

type Result<T = any> = { success: boolean; data?: T; error?: string };

interface TargetRecord {
  id: string;
  title: string;
  targetType: string;
  createdAt: string;
}

const invoke = (channel: string, ...args: any[]) =>
  (window as any).electron.ipcRenderer.invoke(channel, ...args);

const toTarget = (record: TargetRecord, prev?: ReconTarget): ReconTarget => ({
  id: record.id,
  title: record.title,
  type: record.targetType,
  createdAt: record.createdAt,
  isActive: prev?.isActive ?? false,
  browserPid: prev?.browserPid,
});

export const ReconTargetHandlers = {
  async loadTargets(): Promise<Result> {
    try {
      const result = await invoke('recon:targets:list');
      if (!result.success) return { success: false, error: result.error };
      const { targets, setTargets } = useReconStore.getState();
      setTargets(
        (result.data as TargetRecord[]).map((r) =>
          toTarget(
            r,
            targets.find((t) => t.id === r.id),
          ),
        ),
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load targets' };
    }
  },

  async createTarget(): Promise<Result<ReconTarget>> {
    try {
      const result = await invoke('recon:targets:create');
      if (!result.success) return { success: false, error: result.error };
      const target = toTarget(result.data as TargetRecord);
      useReconStore.getState().addTarget(target);
      return { success: true, data: target };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create target' };
    }
  },

  async readTargetFiles(targetId: string): Promise<Result<Record<string, string>>> {
    try {
      return await invoke('recon:targets:readFiles', targetId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files' };
    }
  },

  async readTargetFs(targetId: string): Promise<Result<any[]>> {
    try {
      return await invoke('recon:targets:readFs', targetId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files folder' };
    }
  },

  async writeTargetFile(targetId: string, fileName: string, content: string): Promise<Result> {
    try {
      return await invoke('recon:targets:writeFile', { targetId, fileName, content });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to write target file' };
    }
  },

  async deleteTarget(targetId: string): Promise<Result> {
    try {
      const result = await invoke('recon:targets:delete', targetId);
      if (result.success) useReconStore.getState().removeTarget(targetId);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete target' };
    }
  },

  async launchBrowser(targetId: string): Promise<Result> {
    const { targets, updateTarget } = useReconStore.getState();
    const target = targets.find((t) => t.id === targetId);
    if (!target) return { success: false, error: `Target not found: ${targetId}` };
    if (target.isActive) return { success: false, error: 'Browser already running for this target' };

    try {
      const result = await invoke('browser:launch', { targetId, email: target.title });
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to launch browser' };
      }
      updateTarget(targetId, { isActive: true, browserPid: result.data?.pid });
      return {
        success: true,
        data: {
          output: `Browser launched for target: ${target.title}`,
          targetId,
          pid: result.data?.pid,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to launch browser' };
    }
  },

  async closeBrowser(targetId: string): Promise<Result> {
    const target = useReconStore.getState().targets.find((t) => t.id === targetId);
    if (!target?.isActive) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await invoke('browser:close', targetId);
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to close browser' };
      }
      useReconStore.getState().updateTarget(targetId, { isActive: false, browserPid: undefined });
      return { success: true, data: { output: `Browser closed for target: ${targetId}` } };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to close browser' };
    }
  },
};