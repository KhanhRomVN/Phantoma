/**
 * Automation Service
 * Các thao tác tự động hóa trình duyệt (navigate, click, fill, etc.)
 */
import type { Page } from 'puppeteer';
import { browserManager } from './browser-manager.service';

class AutomationService {
  /**
   * Navigate to URL
   */
  async navigate(
    targetId: string,
    url: string,
    tabId?: string,
    waitUntil?: any,
    timeoutMs?: number,
  ): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.goto(url, {
      waitUntil: waitUntil || 'networkidle2',
      timeout: timeoutMs || 30000,
    });
  }

  /**
   * Go back
   */
  async back(targetId: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.goBack();
  }

  /**
   * Go forward
   */
  async forward(targetId: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.goForward();
  }

  /**
   * Reload page
   */
  async reload(targetId: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.reload();
  }

  /**
   * Get page content
   */
  async getPageContent(targetId: string, tabId?: string): Promise<string> {
    const page = this.getPage(targetId, tabId);
    return await page.evaluate(() => document.body.innerText);
  }

  /**
   * Click element
   */
  async clickElement(targetId: string, selector: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.click(selector);
  }

  /**
   * Fill input
   */
  async fillInput(targetId: string, selector: string, value: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.type(selector, value);
  }

  /**
   * Press key
   */
  async pressKey(targetId: string, key: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.keyboard.press(key as any);
  }

  /**
   * Select option
   */
  async selectOption(
    targetId: string,
    selector: string,
    value?: string,
    label?: string,
    tabId?: string,
  ): Promise<void> {
    const page = this.getPage(targetId, tabId);
    if (value) {
      await page.select(selector, value);
    } else if (label) {
      await page.select(selector, label);
    }
  }

  /**
   * Scroll
   */
  async scroll(
    targetId: string,
    direction: 'up' | 'down' | 'top' | 'bottom',
    amount?: number,
    tabId?: string,
  ): Promise<void> {
    const page = this.getPage(targetId, tabId);
    const dist = amount || 500;

    if (direction === 'down') {
      await page.evaluate((d) => window.scrollBy(0, d), dist);
    } else if (direction === 'up') {
      await page.evaluate((d) => window.scrollBy(0, -d), dist);
    } else if (direction === 'top') {
      await page.evaluate(() => window.scrollTo(0, 0));
    } else if (direction === 'bottom') {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  }

  /**
   * Scroll to element
   */
  async scrollToElement(targetId: string, selector: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.$eval(selector, (el) => el.scrollIntoView());
  }

  /**
   * Hover over element
   */
  async hover(targetId: string, selector: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.hover(selector);
  }

  /**
   * Clear input
   */
  async clearInput(targetId: string, selector: string, tabId?: string): Promise<void> {
    const page = this.getPage(targetId, tabId);
    await page.$eval(selector, (el) => {
      (el as HTMLInputElement).value = '';
    });
  }

  /**
   * Upload file
   */
  async uploadFile(targetId: string, selector: string, filePath: string, tabId?: string): Promise<string> {
    const page = this.getPage(targetId, tabId);
    const input = await page.$(selector);
    if (!input) {
      throw new Error(`Input not found for selector: ${selector}`);
    }
    await input.uploadFile(filePath);
    return filePath.split('/').pop() || '';
  }

  /**
   * Evaluate JavaScript
   */
  async evaluateJs(targetId: string, script: string, tabId?: string): Promise<any> {
    const page = this.getPage(targetId, tabId);
    return await page.evaluate(script);
  }

  /**
   * Wait for condition
   */
  async waitFor(
    targetId: string,
    condition: string,
    selector?: string,
    text?: string,
    timeoutMs?: number,
    tabId?: string,
  ): Promise<number> {
    const page = this.getPage(targetId, tabId);
    const start = Date.now();

    if (condition === 'element_visible' && selector) {
      await page.waitForSelector(selector, { timeout: timeoutMs || 5000 });
    } else if (condition === 'text_present' && text) {
      await page.waitForFunction(
        (t) => document.body.innerText.includes(t),
        { timeout: timeoutMs || 5000 },
        text,
      );
    } else if (condition === 'network_idle') {
      await page.waitForNetworkIdle({ timeout: timeoutMs || 5000 });
    }

    return Date.now() - start;
  }

  /**
   * Capture screenshot
   */
  async screenshot(targetId: string, fullPage?: boolean, tabId?: string): Promise<string> {
    const page = this.getPage(targetId, tabId);
    const buffer = (await page.screenshot({
      fullPage,
      encoding: 'base64',
    })) as string;
    return buffer;
  }

  /**
   * List frames
   */
  async listFrames(targetId: string, tabId?: string): Promise<Array<{ url: string; name: string }>> {
    const page = this.getPage(targetId, tabId);
    return page.frames().map((f) => ({ url: f.url(), name: f.name() }));
  }

  /**
   * Helper: Get page (active hoặc theo tabId)
   */
  private getPage(targetId: string, tabId?: string): Page {
    const session = browserManager.getSession(targetId);
    if (!session) {
      throw new Error(`No browser session found for target: ${targetId}`);
    }

    if (tabId) {
      const page = session.pages.get(tabId);
      if (!page) {
        throw new Error(`Tab not found: ${tabId}`);
      }
      return page;
    }

    if (!session.activeTabId) {
      throw new Error(`No active tab for target: ${targetId}`);
    }

    const page = session.pages.get(session.activeTabId);
    if (!page) {
      throw new Error(`Active tab page not found`);
    }

    return page;
  }
}

export const automationService = new AutomationService();