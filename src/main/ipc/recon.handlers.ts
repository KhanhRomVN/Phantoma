/**
 * Recon IPC Handlers
 * Bridge between Renderer and Recon Server
 */
import { ipcMain } from 'electron';
import axios from 'axios';
import { reconStorage } from '../storage/ReconStorage';

const RECON_SERVER_URL = process.env.RECON_SERVER_URL || 'http://localhost:3003';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Helper function to call Recon Server API
 */
async function callReconApi(endpoint: string, method: 'GET' | 'POST' | 'DELETE', data?: any): Promise<ApiResponse> {
  try {
    const url = `${RECON_SERVER_URL}${endpoint}`;
    const response = await axios({ method, url, data, params: method === 'GET' ? data : undefined });
    return response.data;
  } catch (error: any) {
    console.error(`[Recon IPC] API call failed: ${endpoint}`, error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'API call failed',
    };
  }
}

export function setupReconHandlers(): void {
  // ── Target storage (local filesystem) ───────────────────────────

  ipcMain.handle('recon:targets:list', async () => {
    try {
      return { success: true, data: reconStorage.listTargets() };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list targets' };
    }
  });

  ipcMain.handle('recon:targets:create', async () => {
    try {
      return { success: true, data: reconStorage.createTarget() };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create target' };
    }
  });

  ipcMain.handle('recon:targets:readFiles', async (_, targetId: string) => {
    try {
      return { success: true, data: reconStorage.readTargetFiles(targetId) };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files' };
    }
  });

  ipcMain.handle(
    'recon:targets:writeFile',
    async (_, options: { targetId: string; fileName: string; content: string }) => {
      try {
        reconStorage.writeTargetFile(options.targetId, options.fileName, options.content);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to write target file' };
      }
    },
  );

  ipcMain.handle('recon:targets:readFs', async (_, targetId: string) => {
    try {
      return { success: true, data: reconStorage.readTargetFs(targetId) };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files folder' };
    }
  });

  ipcMain.handle('recon:targets:delete', async (_, targetId: string) => {
    try {
      reconStorage.deleteTarget(targetId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete target' };
    }
  });

  /**
   * Launch browser
   */
  ipcMain.handle('browser:launch', async (_, options: { targetId: string; email: string; executablePath?: string }) => {
    return await callReconApi('/api/browser/launch', 'POST', {
      targetId: options.targetId,
      executablePath: options.executablePath,
    });
  });

  /**
   * Close browser
   */
  ipcMain.handle('browser:close', async (_, targetId: string) => {
    return await callReconApi('/api/browser/close', 'POST', { targetId });
  });

  /**
   * Get browser status
   */
  ipcMain.handle('browser:status', async (_, targetId?: string) => {
    return await callReconApi('/api/browser/status', 'GET', targetId ? { targetId } : {});
  });

  /**
   * List tabs
   */
  ipcMain.handle('browser:listTabs', async (_, targetId: string) => {
    return await callReconApi('/api/browser/tabs', 'GET', { targetId });
  });

  /**
   * Create tab
   */
  ipcMain.handle('browser:createTab', async (_, options: { targetId: string; url?: string }) => {
    return await callReconApi('/api/browser/tabs', 'POST', options);
  });

  /**
   * Close tab
   */
  ipcMain.handle('browser:closeTab', async (_, options: { targetId: string; tabId: string }) => {
    return await callReconApi('/api/browser/tabs', 'DELETE', options);
  });

  /**
   * Switch tab
   */
  ipcMain.handle('browser:switchTab', async (_, options: { targetId: string; tabId: string }) => {
    return await callReconApi('/api/browser/tabs/switch', 'POST', options);
  });

  /**
   * Navigate
   */
  ipcMain.handle('browser:navigate', async (_, options: { targetId: string; url: string; tabId?: string; waitUntil?: string; timeoutMs?: number }) => {
    return await callReconApi('/api/browser/navigate', 'POST', options);
  });

  /**
   * Back
   */
  ipcMain.handle('browser:back', async (_, options: { targetId: string; tabId?: string }) => {
    return await callReconApi('/api/browser/back', 'POST', options);
  });

  /**
   * Forward
   */
  ipcMain.handle('browser:forward', async (_, options: { targetId: string; tabId?: string }) => {
    return await callReconApi('/api/browser/forward', 'POST', options);
  });

  /**
   * Reload
   */
  ipcMain.handle('browser:reload', async (_, options: { targetId: string; tabId?: string }) => {
    return await callReconApi('/api/browser/reload', 'POST', options);
  });

  /**
   * Get page content
   */
  ipcMain.handle('browser:getPageContent', async (_, options: { targetId: string; tabId?: string }) => {
    return await callReconApi('/api/browser/content', 'GET', options);
  });

  /**
   * Click element
   */
  ipcMain.handle('browser:clickElement', async (_, options: { targetId: string; ref: string; tabId?: string }) => {
    return await callReconApi('/api/browser/click', 'POST', {
      targetId: options.targetId,
      selector: `#${options.ref}`, // Convert ref to selector
      tabId: options.tabId,
    });
  });

  /**
   * Fill input
   */
  ipcMain.handle('browser:fillInput', async (_, options: { targetId: string; ref: string; value: string; tabId?: string }) => {
    return await callReconApi('/api/browser/fill', 'POST', {
      targetId: options.targetId,
      selector: `#${options.ref}`,
      value: options.value,
      tabId: options.tabId,
    });
  });

  /**
   * Press key
   */
  ipcMain.handle('browser:pressKey', async (_, options: { targetId: string; key: string; tabId?: string }) => {
    return await callReconApi('/api/browser/key', 'POST', options);
  });

  /**
   * Screenshot
   */
  ipcMain.handle('browser:screenshot', async (_, options: { targetId: string; tabId?: string; fullPage?: boolean }) => {
    return await callReconApi('/api/browser/screenshot', 'GET', options);
  });

  // Các handlers khác (selectOption, waitFor, scroll, hover, clearInput, uploadFile, evaluateJs, listFrames, scrollToElement)
  // có thể bổ sung tương tự khi cần thiết
}