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
