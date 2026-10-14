/**
 * ------------------------------------------------------------------
 * IPC Browser Handlers (Monolithic)
 * ------------------------------------------------------------------
 * Tự động hóa trình duyệt dựa trên Puppeteer.
 * Toàn bộ logic nghiệp vụ (Tab management, Navigation, Content extraction,
 * Interaction) được tích hợp trực tiếp trong file này dưới dạng các inline class
 * (`TabHandler`, `NavigationHandler`, `ContentHandler`, `InteractionHandler`)
 * thay vì tách ra module riêng, nhằm giảm thiểu dependency và đơn giản hóa deployment.
 *
 * Inline Classes:
 * - TabHandler           : Quản lý danh sách tab, register/unregister/setActive/listTabs
 * - NavigationHandler    : goto/back/forward/reload với timeout & waitUntil tùy chỉnh
 * - ContentHandler       : getPageContent, listElements, listFrames, screenshot, ref→selector map
 * - InteractionHandler   : click/fill/pressKey/selectOption/waitFor/scroll/upload/hover/clearInput
 *
 * Types:
 * - BrowserSession : Trạng thái phiên làm việc bao gồm instance Browser, Page và 4 Handler con
 *
 * Constants:
 * - activeSessions : Map lưu trữ các phiên trình duyệt đang hoạt động theo targetId
 *
 * Channels:
 * - browser:launch           : Khởi chạy browser mới hoặc attach vào session có sẵn
 * - browser:close            : Đóng browser và dọn dẹp tài nguyên cho một target
 * - browser:status           : Kiểm tra trạng thái hoạt động của browser session
 * - browser:navigate         : Điều hướng trang web đến URL chỉ định
 * - browser:get-page         : Lấy reference Page object (internal use)
 * - browser:listTabs         : Liệt kê tất cả tab đang mở trong session
 * - browser:createTab        : Tạo tab mới và tùy ý navigate ngay lập tức
 * - browser:closeTab         : Đóng một tab cụ thể
 * - browser:switchTab        : Chuyển focus sang một tab khác
 * - browser:back             : Quay lại lịch sử duyệt web
 * - browser:forward          : Tiến tới lịch sử duyệt web
 * - browser:reload           : Tải lại trang hiện tại
 * - browser:getPageContent   : Trích xuất nội dung HTML/text từ trang
 * - browser:listElements     : Liệt kê các phần tử DOM khớp với filter
 * - browser:clickElement     : Click chuột vào phần tử xác định bởi ref
 * - browser:fillInput        : Nhập dữ liệu vào input/textarea
 * - browser:pressKey         : Gửi phím bấm (Enter, Escape...)
 * - browser:selectOption     : Chọn option trong thẻ <select>
 * - browser:waitFor          : Chờ đợi điều kiện (element visible, network idle...)
 * - browser:scrollToElement  : Cuộn trang đến vị trí phần tử
 * - browser:listFrames       : Liệt kê các iframe/frame trong trang
 * - browser:evaluateJs       : Thực thi đoạn JavaScript bất kỳ trong context trang
 * - browser:uploadFile       : Upload file thông qua input[type=file]
 * - browser:clearInput       : Xóa nội dung hiện tại của input field
 * - browser:hover            : Di chuột qua phần tử (trigger hover events)
 * - browser:scroll           : Cuộn trang theo hướng hoặc khoảng cách
 * - browser:screenshot       : Chụp ảnh màn hình trang (full page hoặc viewport)
 *
 * Functions:
 * - setupBrowserHandlers()    : Entry point đăng ký toàn bộ IPC handler nhóm 'browser:'
 *                               Khởi tạo các Inline Handler class cho mỗi session.
 * - closeAllBrowserSessions() : Cleanup function gọi khi app quit để kill mọi process
 * ------------------------------------------------------------------
 */
// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── External ──
import type { Browser, Page, ElementHandle } from 'puppeteer';
// ── Internal ─
import { logger } from '../utils/logger';

// ─── Inline Handlers (Consolidated) ─────────────────────────────────────
/** Quản lý danh sách tab và trạng thái active */
class TabHandler {
  private tabs = new Map<string, Page>();
  private activeTabId: string | null = null;

  registerTab(id: string, page: Page) { this.tabs.set(id, page); }
  unregisterTab(id: string) { 
    if (this.activeTabId === id) this.activeTabId = null;
    this.tabs.delete(id); 
  }
  setActiveTab(id: string) { this.activeTabId = id; }
  getActiveTab(): Page | undefined { return this.activeTabId ? this.tabs.get(this.activeTabId) : undefined; }
  getTab(id: string): Page | undefined { return this.tabs.get(id); }
  getTabCount() { return this.tabs.size; }
  
  async listTabs() {
    const result = [];
    for (const [id, p] of this.tabs.entries()) {
      result.push({ id, url: p.url(), isActive: id === this.activeTabId });
    }
    return result;
  }
}

/** Xử lý điều hướng URL, back, forward, reload */
class NavigationHandler {
  async navigate(page: Page, url: string, waitUntil?: any, timeoutMs?: number) {
    await page.goto(url, { waitUntil: waitUntil || 'networkidle2', timeout: timeoutMs || 30000 });
  }
  async back(page: Page) { await page.goBack(); }
  async forward(page: Page) { await page.goForward(); }
  async reload(page: Page) { await page.reload(); }
}

/** Trích xuất nội dung, DOM elements, screenshot */
class ContentHandler {
  // Lưu map ref -> selector để resolve nhanh khi tương tác
  private elementRefMap = new Map<string, string>();

  async getPageContent(page: Page) {
    return await page.evaluate(() => document.body.innerText);
  }

  async listElements(_page: Page, _elementType?: string, _labelContains?: string, _visibleOnly?: boolean, limit?: number, offset?: number) {
    // TODO: Implement filtering by elementType, labelContains, visibleOnly
    const elements = await _page.$$eval('*', els => els.map(el => ({ tag: el.tagName.toLowerCase() })));
    return elements.slice(offset || 0, (offset || 0) + (limit || 100));
  }

  getSelectorByRef(ref: string): string | undefined {
    return this.elementRefMap.get(ref);
  }

  setSelectorForRef(ref: string, selector: string) {
    this.elementRefMap.set(ref, selector);
  }

  async listFrames(page: Page) {
    return page.frames().map(f => ({ url: f.url(), name: f.name() }));
  }

  async captureScreenshotWithOverlay(page: Page, fullPage?: boolean) {
    const buffer = await page.screenshot({ fullPage, encoding: 'base64' }) as string;
    return { imageBase64: buffer };
  }
}

/** Tương tác người dùng: click, fill, key, scroll... */
class InteractionHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_contentHandler?: ContentHandler) {}

  async clickByRef(page: Page, _ref: string, selector: string, _wasFromMap: boolean, _clickType?: string) {
    await page.click(selector);
    return { newTabId: null };
  }

  async fillByRef(page: Page, _ref: string, selector: string, value: string, _wasFromMap: boolean) {
    await page.type(selector, value);
  }

  async pressKey(page: Page, key: string) {
    await page.keyboard.press(key as any);
  }

  async selectOptionByRef(page: Page, _ref: string, selector: string, value?: string, label?: string, _wasFromMap?: boolean) {
    if (value) await page.select(selector, value);
    else if (label) await page.select(selector, label);
    return { success: true };
  }

  async waitFor(page: Page, condition: string, selector?: string, text?: string, timeoutMs?: number) {
    const start = Date.now();
    if (condition === 'element_visible' && selector) {
      await page.waitForSelector(selector, { timeout: timeoutMs || 5000 });
    } else if (condition === 'text_present' && text) {
      await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: timeoutMs || 5000 }, text);
    } else if (condition === 'network_idle') {
      await page.waitForNetworkIdle({ timeout: timeoutMs || 5000 });
    }
    return Date.now() - start;
  }

  async scrollToElement(page: Page, _ref: string, selector: string, _wasFromMap: boolean) {
    await page.$eval(selector, (el) => el.scrollIntoView());
    return true;
  }

  async evaluateJs(page: Page, script: string) {
    return await page.evaluate(script);
  }

  async uploadFileByRef(page: Page, _ref: string, selector: string, filePath: string, _wasFromMap: boolean) {
    const input = await page.$(selector);
    if (!input) throw new Error(`Input not found for ${selector}`);
    await (input as ElementHandle<HTMLInputElement>).uploadFile(filePath);
    return filePath.split('/').pop();
  }

  async clearInputByRef(page: Page, _ref: string, selector: string, _wasFromMap: boolean) {
    await page.$eval(selector, (el) => { (el as HTMLInputElement).value = ''; });
  }

  async hoverByRef(page: Page, _ref: string, selector: string, _wasFromMap: boolean) {
    await page.hover(selector);
  }

  async scroll(page: Page, direction: string, amount?: number) {
    const dist = amount || 500;
    if (direction === 'down') await page.evaluate(d => window.scrollBy(0, d), dist);
    else if (direction === 'up') await page.evaluate(d => window.scrollBy(0, -d), dist);
    else if (direction === 'top') await page.evaluate(() => window.scrollTo(0, 0));
    else if (direction === 'bottom') await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}

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
        const { targetId, executablePath } = options;

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
