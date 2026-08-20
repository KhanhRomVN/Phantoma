/**
 * ------------------------------------------------------------------
 * Trình xử lý tab
 * ------------------------------------------------------------------
 * Xử lý các thao tác tab cho tự động hóa trình duyệt. Quản lý đăng ký
 * page, theo dõi tab đang hoạt động, liệt kê tab và dọn dẹp.
 *
 * Hàm chính:
 * - registerTab()   : Đăng ký một page/tab mới
 * - unregisterTab() : Xóa một page/tab
 * - getTab()        : Lấy page theo ID tab
 * - getActiveTab()  : Lấy tab đang hoạt động
 * - setActiveTab()  : Đặt tab đang hoạt động
 * - listTabs()      : Liệt kê tất cả tab với thông tin
 * - closeAll()      : Đóng tất cả tab
 * ------------------------------------------------------------------
 */

import type { Page } from 'puppeteer';
import { logger } from '../../utils/logger';

export interface TabInfo {
  tabId: string;
  title: string;
  url: string;
  isActive: boolean;
}

export class TabHandler {
  private pages: Map<string, Page> = new Map();
  private activeTabId: string | null = null;

  /**
   * Register a new page/tab
   */
  public registerTab(tabId: string, page: Page): void {
    this.pages.set(tabId, page);
  }

  /**
   * Unregister a page/tab
   */
  public unregisterTab(tabId: string): void {
    this.pages.delete(tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }
  }

  /**
   * Get a page by tab ID
   */
  public getTab(tabId: string): Page | undefined {
    return this.pages.get(tabId);
  }

  /**
   * Get the active tab
   */
  public getActiveTab(): Page | null {
    if (!this.activeTabId) {
      // Return the first tab if no active tab is set
      const firstPage = Array.from(this.pages.values())[0];
      return firstPage || null;
    }
    return this.pages.get(this.activeTabId) || null;
  }

  /**
   * Set the active tab
   */
  public setActiveTab(tabId: string): void {
    if (this.pages.has(tabId)) {
      this.activeTabId = tabId;
    }
  }

  /**
   * List all tabs with their info
   */
  public async listTabs(): Promise<TabInfo[]> {
    const tabs: TabInfo[] = [];

    for (const [tabId, page] of this.pages.entries()) {
      try {
        const title = await page.title();
        const url = page.url();
        
        tabs.push({
          tabId,
          title,
          url,
          isActive: tabId === this.activeTabId,
        });
      } catch (error) {
        // Page might be closed or invalid
        logger.error(`Error getting info for tab ${tabId}:`, error);
      }
    }

    return tabs;
  }

  /**
   * Get all page instances
   */
  public getAllPages(): Page[] {
    return Array.from(this.pages.values());
  }

  /**
   * Close all tabs
   */
  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.pages.values()).map(page => 
      page.close().catch(err => logger.error('Error closing page:', err))
    );
    await Promise.all(closePromises);
    this.pages.clear();
    this.activeTabId = null;
  }

  /**
   * Get tab count
   */
  public getTabCount(): number {
    return this.pages.size;
  }
}
