/**
 * Browser Manager Service
 * Quản lý lifecycle của browser sessions qua CDP
 */
import { EventEmitter } from 'events';
import type { Browser, Page } from 'puppeteer';
import type { BrowserSession, TabInfo, LaunchOptions } from '../types/session';

let puppeteerModule: typeof import('puppeteer') | null = null;

class BrowserManagerService extends EventEmitter {
  private sessions: Map<string, BrowserSession> = new Map();

  constructor() {
    super();
  }

  /**
   * Launch browser cho một target
   */
  async launch(options: LaunchOptions): Promise<BrowserSession> {
    const { targetId, executablePath, headless = false, args = [] } = options;

    // Check nếu session đã tồn tại
    if (this.sessions.has(targetId)) {
      throw new Error(`Browser session already exists for target: ${targetId}`);
    }

    // Lazy load puppeteer
    if (!puppeteerModule) {
      puppeteerModule = await import('puppeteer');
    }

    const browserPath = executablePath || '/opt/ungoogled-chromium/chrome';

    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ];

    const browser = await puppeteerModule.default.launch({
      executablePath: browserPath,
      headless,
      args: [...defaultArgs, ...args],
    });

    // Lấy page đầu tiên hoặc tạo mới
    const pages = await browser.pages();
    const firstPage = pages[0] || (await browser.newPage());
    await firstPage.setViewport({ width: 1920, height: 1080 });

    const tabId = 'tab-001';
    const pagesMap = new Map<string, Page>();
    pagesMap.set(tabId, firstPage);

    const session: BrowserSession = {
      targetId,
      browser,
      pages: pagesMap,
      activeTabId: tabId,
      pid: browser.process()?.pid,
      createdAt: Date.now(),
    };

    this.sessions.set(targetId, session);

    console.log(`[BrowserManager] Launched browser for target ${targetId} (PID: ${session.pid})`);

    return session;
  }

  /**
   * Close browser session
   */
  async close(targetId: string): Promise<boolean> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return false;
    }

    try {
      await session.browser.close();
      this.sessions.delete(targetId);
      console.log(`[BrowserManager] Closed browser for target ${targetId}`);
      return true;
    } catch (err) {
      console.error(`[BrowserManager] Error closing browser for ${targetId}:`, err);
      return false;
    }
  }

  /**
   * Get session by targetId
   */
  getSession(targetId: string): BrowserSession | undefined {
    return this.sessions.get(targetId);
  }

  /**
   * Get active page for target
   */
  getActivePage(targetId: string): Page | undefined {
    const session = this.sessions.get(targetId);
    if (!session || !session.activeTabId) {
      return undefined;
    }
    return session.pages.get(session.activeTabId);
  }

  /**
   * List all tabs for target
   */
  async listTabs(targetId: string): Promise<TabInfo[]> {
    const session = this.sessions.get(targetId);
    if (!session) {
      throw new Error(`No session found for target: ${targetId}`);
    }

    const tabs: TabInfo[] = [];
    for (const [tabId, page] of session.pages.entries()) {
      tabs.push({
        id: tabId,
        url: page.url(),
        title: await page.title(),
        isActive: tabId === session.activeTabId,
      });
    }

    return tabs;
  }

  /**
   * Create new tab
   */
  async createTab(targetId: string, url?: string): Promise<{ tabId: string; url: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      throw new Error(`No session found for target: ${targetId}`);
    }

    const newPage = await session.browser.newPage();
    await newPage.setViewport({ width: 1920, height: 1080 });

    const tabCount = session.pages.size;
    const newTabId = `tab-${String(tabCount + 1).padStart(3, '0')}`;

    session.pages.set(newTabId, newPage);

    if (url) {
      await newPage.goto(url, { waitUntil: 'networkidle2' });
    }

    return { tabId: newTabId, url: newPage.url() };
  }

  /**
   * Close tab
   */
  async closeTab(targetId: string, tabId: string): Promise<boolean> {
    const session = this.sessions.get(targetId);
    if (!session) {
      throw new Error(`No session found for target: ${targetId}`);
    }

    const page = session.pages.get(tabId);
    if (!page) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    await page.close();
    session.pages.delete(tabId);

    // Nếu tab đóng là active tab, chuyển sang tab khác
    if (session.activeTabId === tabId) {
      const remainingTabs = Array.from(session.pages.keys());
      session.activeTabId = remainingTabs.length > 0 ? remainingTabs[0] : null;
    }

    return true;
  }

  /**
   * Switch to tab
   */
  async switchTab(targetId: string, tabId: string): Promise<boolean> {
    const session = this.sessions.get(targetId);
    if (!session) {
      throw new Error(`No session found for target: ${targetId}`);
    }

    const page = session.pages.get(tabId);
    if (!page) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    session.activeTabId = tabId;
    await page.bringToFront();

    return true;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Close all sessions
   */
  async closeAll(): Promise<void> {
    const targetIds = Array.from(this.sessions.keys());
    await Promise.allSettled(targetIds.map((id) => this.close(id)));
    this.sessions.clear();
  }
}

export const browserManager = new BrowserManagerService();