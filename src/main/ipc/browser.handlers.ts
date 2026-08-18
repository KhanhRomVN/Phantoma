/**
 * Browser IPC Handlers for Recon Module
 * Handle browser launch/close operations using Puppeteer
 */

import { ipcMain } from 'electron';
import type { Browser, Page } from 'puppeteer';

interface BrowserSession {
  browser: Browser;
  page: Page;
  targetId: string;
  pid?: number;
}

// Store active browser sessions
const activeSessions = new Map<string, BrowserSession>();

// Lazily load puppeteer to avoid ERR_REQUIRE_ESM in CommonJS main process
let puppeteerModule: typeof import('puppeteer') | null = null;

export function setupBrowserHandlers(): void {
  /**
   * Launch browser for a target
   */
  ipcMain.handle('browser:launch', async (_, options: {
    targetId: string;
    email: string;
    executablePath?: string;
  }) => {
    try {
      const { targetId, email, executablePath } = options;

      // Close existing session if already running
      if (activeSessions.has(targetId)) {
        const existingSession = activeSessions.get(targetId)!;
        try {
          await existingSession.browser.close();
        } catch (e) {
          console.error('[Browser] Failed to close existing session:', e);
        }
        activeSessions.delete(targetId);
      }

      // Launch browser with Puppeteer
      const browserPath = executablePath || '/opt/ungoogled-chromium/chrome';
      
      console.log(`[Browser] Launching for target: ${email}`);
      
      if (!puppeteerModule) {
        puppeteerModule = await import('puppeteer');
      }

      const browser = await puppeteerModule.default.launch({
        executablePath: browserPath,
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080',
        ],
      });

      // Get page
      const pages = await browser.pages();
      const page = pages[0] || await browser.newPage();
      
      await page.setViewport({ width: 1920, height: 1080 });

      // Store session
      const session: BrowserSession = {
        browser,
        page,
        targetId,
        pid: browser.process()?.pid,
      };

      activeSessions.set(targetId, session);

      console.log(`[Browser] Launched successfully for ${email}, PID: ${session.pid}`);

      return {
        success: true,
        data: {
          targetId,
          pid: session.pid,
        },
      };
    } catch (error: any) {
      console.error('[Browser] Launch failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to launch browser',
      };
    }
  });

  /**
   * Close browser for a target
   */
  ipcMain.handle('browser:close', async (_, targetId: string) => {
    try {
      const session = activeSessions.get(targetId);
      
      if (!session) {
        return {
          success: false,
          error: 'No active browser session for this target',
        };
      }

      console.log(`[Browser] Closing for target: ${targetId}`);

      // Close browser
      await session.browser.close();

      // Remove from active sessions
      activeSessions.delete(targetId);

      console.log(`[Browser] Closed successfully for ${targetId}`);

      return {
        success: true,
        data: {
          targetId,
        },
      };
    } catch (error: any) {
      console.error('[Browser] Close failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to close browser',
      };
    }
  });

  /**
   * Get browser status
   */
  ipcMain.handle('browser:status', async (_, targetId?: string) => {
    try {
      if (targetId) {
        // Get specific session
        const session = activeSessions.get(targetId);
        return {
          success: true,
          data: {
            targetId,
            isActive: !!session,
            pid: session?.pid,
          },
        };
      }

      // Get all sessions
      const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
        targetId: id,
        isActive: true,
        pid: session.pid,
      }));

      return {
        success: true,
        data: sessions,
      };
    } catch (error: any) {
      console.error('[Browser] Status check failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get browser status',
      };
    }
  });

  /**
   * Navigate browser to URL
   */
  ipcMain.handle('browser:navigate', async (_, options: {
    targetId: string;
    url: string;
  }) => {
    try {
      const { targetId, url } = options;
      const session = activeSessions.get(targetId);

      if (!session) {
        return {
          success: false,
          error: 'No active browser session for this target',
        };
      }

      console.log(`[Browser] Navigating to ${url} for target: ${targetId}`);

      await session.page.goto(url);

      return {
        success: true,
        data: {
          targetId,
          url,
        },
      };
    } catch (error: any) {
      console.error('[Browser] Navigation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to navigate browser',
      };
    }
  });

  /**
   * Get browser page
   * Returns the Page object for Puppeteer integration
   */
  ipcMain.handle('browser:get-page', async (_, targetId: string) => {
    try {
      const session = activeSessions.get(targetId);

      if (!session) {
        return {
          success: false,
          error: 'No active browser session for this target',
        };
      }

      // Note: We can't directly pass the Page object through IPC
      // This handler is mainly for internal use
      return {
        success: true,
        data: {
          targetId,
          hasPage: !!session.page,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get browser page',
      };
    }
  });
}

/**
 * Get active browser session (for integration with other tools)
 * This is exported for use by other services
 */
export function getBrowserSession(targetId: string): BrowserSession | undefined {
  return activeSessions.get(targetId);
}

/**
 * Cleanup all browser sessions on app shutdown
 */
export async function closeAllBrowserSessions(): Promise<void> {
  console.log('[Browser] Closing all sessions...');
  
  const closeTasks = Array.from(activeSessions.values()).map(async (session) => {
    try {
      await session.browser.close();
    } catch (error) {
      console.error(`[Browser] Failed to close session for ${session.targetId}:`, error);
    }
  });

  await Promise.all(closeTasks);
  activeSessions.clear();
  
  console.log('[Browser] All sessions closed');
}
