/**
 * ------------------------------------------------------------------
 * Trình xử lý điều hướng
 * ------------------------------------------------------------------
 * Xử lý các thao tác điều hướng cho tự động hóa trình duyệt:
 * điều hướng URL, quay lại/tiến tới, tải lại và truy vấn thông tin trang.
 *
 * Hàm chính:
 * - navigate()          : Điều hướng đến URL
 * - back()              : Quay lại lịch sử
 * - forward()           : Tiến tới trong lịch sử
 * - reload()            : Tải lại trang
 * - getCurrentUrl()     : Lấy URL trang hiện tại
 * - getTitle()          : Lấy tiêu đề trang
 * ------------------------------------------------------------------
 */

import type { Page } from 'puppeteer';

export class NavigationHandler {
  /**
   * Navigate to a URL
   * @param waitUntil — domcontentloaded | load | networkidle (default: load)
   * @param timeoutMs — max wait timeout (default: 30000)
   */
  public async navigate(
    page: Page,
    url: string,
    waitUntil: 'domcontentloaded' | 'load' | 'networkidle' = 'load',
    timeoutMs: number = 30000,
  ): Promise<void> {
    const start = Date.now();
    const puppeteerWaitUntil = waitUntil === 'networkidle' ? 'networkidle0' : waitUntil;

    try {
      await page.goto(url, { waitUntil: puppeteerWaitUntil, timeout: timeoutMs });
      const loadTimeMs = Date.now() - start;
    } catch (e: any) {
      console.error('[DEBUG][navigate] Failed', {
        url,
        waitUntil,
        timeoutMs,
        error: e?.message || String(e),
      });
      throw e;
    }
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
