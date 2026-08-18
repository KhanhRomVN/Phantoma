/**
 * NavigationHandler — Handle navigation operations for browser automation
 * 
 * This handler manages navigation-related operations including navigating to URLs,
 * going back/forward in history, and reloading pages.
 */

import type { Page } from 'puppeteer';

export class NavigationHandler {
  /**
   * Navigate to a URL
   */
  public async navigate(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /**
   * Go back in history
   */
  public async back(page: Page): Promise<void> {
    await page.goBack({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Go forward in history
   */
  public async forward(page: Page): Promise<void> {
    await page.goForward({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Reload the page
   */
  public async reload(page: Page): Promise<void> {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Wait for navigation to complete
   */
  public async waitForNavigation(page: Page): Promise<void> {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  }

  /**
   * Get current URL
   */
  public getCurrentUrl(page: Page): string {
    return page.url();
  }

  /**
   * Get page title
   */
  public async getTitle(page: Page): Promise<string> {
    return await page.title();
  }
}
