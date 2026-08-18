/**
 * TabHandler — Handle tab operations for browser automation
 * 
 * This handler manages tab-related operations including listing, creating,
 * closing, and switching tabs in the browser session.
 */

import type { Page } from 'puppeteer';

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
        console.error(`Error getting info for tab ${tabId}:`, error);
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
      page.close().catch(err => console.error('Error closing page:', err))
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
