/**
 * ------------------------------------------------------------------
 * IPC handler trình duyệt
 * ------------------------------------------------------------------
 * IPC handler cho tự động hóa trình duyệt dựa trên Puppeteer trong
 * module Recon. Quản lý phiên trình duyệt, tab, điều hướng,
 * trích xuất nội dung và tương tác phần tử.
 *
 * Hàm chính:
 * - setupBrowserHandlers()    : Đăng ký tất cả IPC handler browser:
 * - closeAllBrowserSessions() : Đóng tất cả phiên khi tắt máy
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── External ──
import type { Browser, Page } from 'puppeteer';

// ── Internal ──
import { TabHandler } from '../services/recon/TabHandler';
import { NavigationHandler } from '../services/recon/NavigationHandler';
import { ContentHandler } from '../services/recon/ContentHandler';
import { InteractionHandler } from '../services/recon/InteractionHandler';
import { logger } from '../utils/logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface BrowserSession {
  browser: Browser;
  page: Page;
  targetId: string;
  pid?: number;
  tabHandler: TabHandler;
  navigationHandler: NavigationHandler;
  contentHandler: ContentHandler;
  interactionHandler: InteractionHandler;
}

// ─── Constants ──────────────────────────────────────────────────────────
// Store active browser sessions
const activeSessions = new Map<string, BrowserSession>();

// Lazily load puppeteer to avoid ERR_REQUIRE_ESM in CommonJS main process
let puppeteerModule: typeof import('puppeteer') | null = null;

// ─── Functions ──────────────────────────────────────────────────────────
export function setupBrowserHandlers(): void {
  /**
   * Launch browser for a target
   */
  ipcMain.handle(
    'browser:launch',
    async (
      _,
      options: {
        targetId: string;
        email: string;
        executablePath?: string;
      },
    ) => {
      try {
        const { targetId, email, executablePath } = options;

        // Close existing session if already running
        if (activeSessions.has(targetId)) {
          const existingSession = activeSessions.get(targetId)!;
          try {
            await existingSession.browser.close();
          } catch (e) {
            logger.error('[Browser] Failed to close existing session:', e);
          }
          activeSessions.delete(targetId);
        }

        // Launch browser with Puppeteer
        const browserPath = executablePath || '/opt/ungoogled-chromium/chrome';

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
        const page = pages[0] || (await browser.newPage());

        await page.setViewport({ width: 1920, height: 1080 });

        // Initialize handlers
        const tabHandler = new TabHandler();
        tabHandler.registerTab('tab-001', page);
        tabHandler.setActiveTab('tab-001');

        const navigationHandler = new NavigationHandler();
        const contentHandler = new ContentHandler();
        const interactionHandler = new InteractionHandler();

        // Store session
        const session: BrowserSession = {
          browser,
          page,
          targetId,
          pid: browser.process()?.pid,
          tabHandler,
          navigationHandler,
          contentHandler,
          interactionHandler,
        };

        activeSessions.set(targetId, session);

        return {
          success: true,
          data: {
            targetId,
            pid: session.pid,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Launch failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to launch browser',
        };
      }
    },
  );

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

      // Close browser
      await session.browser.close();

      // Remove from active sessions
      activeSessions.delete(targetId);

      return {
        success: true,
        data: {
          targetId,
        },
      };
    } catch (error: any) {
      logger.error('[Browser] Close failed:', error);
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
      logger.error('[Browser] Status check failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get browser status',
      };
    }
  });

  /**
   * Navigate browser to URL
   */
  ipcMain.handle(
    'browser:navigate',
    async (
      _,
      options: {
        targetId: string;
        url: string;
        waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
        timeoutMs?: number;
      },
    ) => {
      try {
        const { targetId, url, waitUntil, timeoutMs } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        await session.navigationHandler.navigate(session.page, url, waitUntil, timeoutMs);

        return {
          success: true,
          data: {
            targetId,
            url,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Navigation failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to navigate browser',
        };
      }
    },
  );

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
      logger.error('[Browser] Get page failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to get browser page',
      };
    }
  });

  /**
   * List all tabs
   */
  ipcMain.handle('browser:listTabs', async (_, targetId: string) => {
    try {
      const session = activeSessions.get(targetId);

      if (!session) {
        return {
          success: false,
          error: 'No active browser session for this target',
        };
      }

      const tabs = await session.tabHandler.listTabs();

      return {
        success: true,
        data: { tabs },
      };
    } catch (error: any) {
      logger.error('[Browser] List tabs failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to list tabs',
      };
    }
  });

  /**
   * Create a new tab
   */
  ipcMain.handle(
    'browser:createTab',
    async (
      _,
      options: {
        targetId: string;
        url?: string;
      },
    ) => {
      try {
        const { targetId, url } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        // Create new page
        const newPage = await session.browser.newPage();
        await newPage.setViewport({ width: 1920, height: 1080 });

        // Generate tab ID
        const tabCount = session.tabHandler.getTabCount();
        const newTabId = `tab-${String(tabCount + 1).padStart(3, '0')}`;

        // Register the new tab
        session.tabHandler.registerTab(newTabId, newPage);

        // Navigate if URL provided
        if (url) {
          await newPage.goto(url, { waitUntil: 'networkidle0' });
        }

        return {
          success: true,
          data: {
            tabId: newTabId,
            url: newPage.url(),
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Create tab failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to create tab',
        };
      }
    },
  );

  /**
   * Close a tab
   */
  ipcMain.handle(
    'browser:closeTab',
    async (
      _,
      options: {
        targetId: string;
        tabId: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = session.tabHandler.getTab(tabId);

        if (!page) {
          return {
            success: false,
            error: `Tab ${tabId} not found`,
          };
        }

        // Close the page
        await page.close();

        // Unregister from handler
        session.tabHandler.unregisterTab(tabId);

        return {
          success: true,
          data: {
            tabId,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Close tab failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to close tab',
        };
      }
    },
  );

  /**
   * Switch to a tab
   */
  ipcMain.handle(
    'browser:switchTab',
    async (
      _,
      options: {
        targetId: string;
        tabId: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = session.tabHandler.getTab(tabId);

        if (!page) {
          return {
            success: false,
            error: `Tab ${tabId} not found`,
          };
        }

        // Set as active tab
        session.tabHandler.setActiveTab(tabId);

        // Bring page to front
        await page.bringToFront();

        return {
          success: true,
          data: {
            tabId,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Switch tab failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to switch tab',
        };
      }
    },
  );

  /**
   * Navigate back
   */
  ipcMain.handle(
    'browser:back',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        await session.navigationHandler.back(page);

        return {
          success: true,
          data: {
            url: page.url(),
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Back navigation failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to navigate back',
        };
      }
    },
  );

  /**
   * Navigate forward
   */
  ipcMain.handle(
    'browser:forward',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        await session.navigationHandler.forward(page);

        return {
          success: true,
          data: {
            url: page.url(),
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Forward navigation failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to navigate forward',
        };
      }
    },
  );

  /**
   * Reload page
   */
  ipcMain.handle(
    'browser:reload',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        await session.navigationHandler.reload(page);

        return {
          success: true,
          data: {
            url: page.url(),
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Reload failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to reload page',
        };
      }
    },
  );

  /**
   * Get page content
   */
  ipcMain.handle(
    'browser:getPageContent',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const content = await session.contentHandler.getPageContent(page);

        return {
          success: true,
          data: content,
        };
      } catch (error: any) {
        logger.error('[Browser] Get page content failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to get page content',
        };
      }
    },
  );

  /**
   * List elements
   */
  ipcMain.handle(
    'browser:listElements',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        elementType?: string;
        labelContains?: string;
        visibleOnly?: boolean;
        limit?: number;
        offset?: number;
      },
    ) => {
      try {
        const { targetId, tabId, elementType, labelContains, visibleOnly, limit, offset } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const elements = await session.contentHandler.listElements(
          page,
          elementType,
          labelContains,
          visibleOnly,
          limit,
          offset,
        );

        return {
          success: true,
          data: { elements },
        };
      } catch (error: any) {
        logger.error('[Browser] List elements failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to list elements',
        };
      }
    },
  );

  /**
   * Click element
   */
  ipcMain.handle(
    'browser:clickElement',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
        clickType?: 'single' | 'double' | 'right';
      },
    ) => {
      try {
        const { targetId, tabId, ref, clickType } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        const clickResult = await session.interactionHandler.clickByRef(
          page,
          ref,
          selector,
          wasFromMap,
          clickType,
        );

        return {
          success: true,
          data: {
            ref,
            newTabId: clickResult.newTabId,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Click element failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to click element',
        };
      }
    },
  );

  /**
   * Fill input
   */
  ipcMain.handle(
    'browser:fillInput',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
        value: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref, value } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        // Resolve selector from ContentHandler.elementRefMap, fallback to #ref
        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;
        await session.interactionHandler.fillByRef(page, ref, selector, value, wasFromMap);

        return {
          success: true,
          data: {
            ref,
            value,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Fill input failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to fill input',
        };
      }
    },
  );

  /**
   * Press key
   */
  ipcMain.handle(
    'browser:pressKey',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        key: string;
      },
    ) => {
      try {
        const { targetId, tabId, key } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        await session.interactionHandler.pressKey(page, key);

        return {
          success: true,
          data: {
            key,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Press key failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to press key',
        };
      }
    },
  );

  /**
   * Select option from dropdown
   */
  ipcMain.handle(
    'browser:selectOption',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
        value?: string;
        label?: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref, value, label } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        const result = await session.interactionHandler.selectOptionByRef(
          page,
          ref,
          selector,
          value,
          label,
          wasFromMap,
        );

        return {
          success: true,
          data: {
            ref,
            selected: result,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Select option failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to select option',
        };
      }
    },
  );

  /**
   * Wait for a condition
   */
  ipcMain.handle(
    'browser:waitFor',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        condition: 'element_visible' | 'element_hidden' | 'text_present' | 'network_idle';
        ref?: string;
        text?: string;
        timeoutMs?: number;
      },
    ) => {
      try {
        const { targetId, tabId, condition, ref, text, timeoutMs } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        // Resolve selector from ref if provided
        let selector: string | undefined;
        if (ref) {
          selector = session.contentHandler.getSelectorByRef(ref) || `#${ref}`;
        }

        const waitedMs = await session.interactionHandler.waitFor(
          page,
          condition,
          selector,
          text,
          timeoutMs,
        );

        return {
          success: true,
          data: {
            condition,
            ref,
            text,
            waitedMs,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Wait failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to wait',
        };
      }
    },
  );

  /**
   * Scroll to a specific element
   */
  ipcMain.handle(
    'browser:scrollToElement',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        const visible = await session.interactionHandler.scrollToElement(
          page,
          ref,
          selector,
          wasFromMap,
        );

        return {
          success: true,
          data: {
            ref,
            visible,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Scroll to element failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to scroll to element',
        };
      }
    },
  );

  /**
   * List frames
   */
  ipcMain.handle(
    'browser:listFrames',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
      },
    ) => {
      try {
        const { targetId, tabId } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const frames = await session.contentHandler.listFrames(page);

        return {
          success: true,
          data: { frames },
        };
      } catch (error: any) {
        logger.error('[Browser] List frames failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to list frames',
        };
      }
    },
  );

  /**
   * Evaluate JavaScript
   */
  ipcMain.handle(
    'browser:evaluateJs',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        script: string;
      },
    ) => {
      try {
        const { targetId, tabId, script } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const result = await session.interactionHandler.evaluateJs(page, script);

        return {
          success: true,
          data: { result },
        };
      } catch (error: any) {
        logger.error('[Browser] Evaluate JS failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to evaluate JS',
        };
      }
    },
  );

  /**
   * Upload file
   */
  ipcMain.handle(
    'browser:uploadFile',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
        filePath: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref, filePath } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        const fileName = await session.interactionHandler.uploadFileByRef(
          page,
          ref,
          selector,
          filePath,
          wasFromMap,
        );

        return {
          success: true,
          data: { ref, fileName },
        };
      } catch (error: any) {
        logger.error('[Browser] Upload file failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to upload file',
        };
      }
    },
  );

  /**
   * Clear input content
   */
  ipcMain.handle(
    'browser:clearInput',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        await session.interactionHandler.clearInputByRef(page, ref, selector, wasFromMap);

        return {
          success: true,
          data: { ref },
        };
      } catch (error: any) {
        logger.error('[Browser] Clear input failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to clear input',
        };
      }
    },
  );

  /**
   * Hover over an element
   */
  ipcMain.handle(
    'browser:hover',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        ref: string;
      },
    ) => {
      try {
        const { targetId, tabId, ref } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const resolvedSelector = session.contentHandler.getSelectorByRef(ref);
        const selector = resolvedSelector || `#${ref}`;
        const wasFromMap = !!resolvedSelector;

        await session.interactionHandler.hoverByRef(page, ref, selector, wasFromMap);

        return {
          success: true,
          data: { ref },
        };
      } catch (error: any) {
        logger.error('[Browser] Hover failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to hover',
        };
      }
    },
  );

  /**
   * Scroll page
   */
  ipcMain.handle(
    'browser:scroll',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        direction: 'up' | 'down' | 'top' | 'bottom';
        amount?: number;
      },
    ) => {
      try {
        const { targetId, tabId, direction, amount } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        await session.interactionHandler.scroll(page, direction, amount);

        return {
          success: true,
          data: {
            direction,
          },
        };
      } catch (error: any) {
        logger.error('[Browser] Scroll failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to scroll',
        };
      }
    },
  );

  /**
   * Capture full-page screenshot
   */
  ipcMain.handle(
    'browser:screenshot',
    async (
      _,
      options: {
        targetId: string;
        tabId?: string;
        fullPage?: boolean;
      },
    ) => {
      try {
        const { targetId, tabId, fullPage } = options;
        const session = activeSessions.get(targetId);

        if (!session) {
          return {
            success: false,
            error: 'No active browser session for this target',
          };
        }

        const page = tabId ? session.tabHandler.getTab(tabId) : session.tabHandler.getActiveTab();

        if (!page) {
          return {
            success: false,
            error: `Tab not found`,
          };
        }

        const screenshot = await session.contentHandler.captureScreenshotWithOverlay(
          page,
          fullPage,
        );

        return {
          success: true,
          data: screenshot,
        };
      } catch (error: any) {
        logger.error('[Browser] Screenshot failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to capture screenshot',
        };
      }
    },
  );
}

/**
 * Cleanup all browser sessions on app shutdown
 */
export async function closeAllBrowserSessions(): Promise<void> {
  const closeTasks = Array.from(activeSessions.values()).map(async (session) => {
    try {
      await session.browser.close();
    } catch (error) {
      logger.error(`[Browser] Failed to close session for ${session.targetId}:`, error);
    }
  });

  await Promise.all(closeTasks);
  activeSessions.clear();
}
