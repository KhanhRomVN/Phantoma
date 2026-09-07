/**
 * ------------------------------------------------------------------
 * Trình xử lý tương tác
 * ------------------------------------------------------------------
 * Xử lý tương tác trang cho tự động hóa trình duyệt. Quản lý click,
 * điền input, nhấn phím, cuộn trang và truy vấn phần tử.
 *
 * Hàm chính:
 * - clickByRef()        : Click một phần tử theo tham chiếu
 * - fillByRef()         : Điền vào input theo tham chiếu
 * - scroll()            : Cuộn trang
 * - getElementText()    : Lấy nội dung văn bản phần tử
 * - getElementAttribute(): Lấy giá trị thuộc tính phần tử
 * ------------------------------------------------------------------
 */

import type { Page, KeyInput } from 'puppeteer';
import { createToolError, classifyError } from './ErrorTypes';

export class InteractionHandler {
  /**
   * Click an element by selector
   */
  public async clickElement(page: Page, selector: string): Promise<void> {
    await page.click(selector);
  }

  /**
   * Click an element by ref (need to get selector first from ContentHandler)
   * @param selector - CSS selector resolved from ContentHandler.elementRefMap
   */
  public async clickByRef(
    page: Page,
    ref: string,
    selector: string,
    wasFromMap?: boolean,
    clickType: 'single' | 'double' | 'right' = 'single',
  ): Promise<{ newTabId: string | null }> {
    // [DEBUG] Log before click attempt
    console.log('[DEBUG][clickByRef] Start', { ref, selector, wasFromMap, clickType });

    // Snapshot pages before click to detect new tab
    const pagesBefore = await page.browser().pages();
    const pageUrlsBefore = new Set(pagesBefore.map((p) => p.url()));
    
    try {
      if (clickType === 'double') {
        await page.click(selector);
        await page.click(selector);
      } else if (clickType === 'right') {
        await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error(`Element not found: ${sel}`);
          el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        }, selector);
      } else {
        await page.click(selector);
      }

      // Wait a bit to let new tab open
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check for new tab
      const pagesAfter = await page.browser().pages();
      let newTabId: string | null = null;
      for (const p of pagesAfter) {
        if (!pageUrlsBefore.has(p.url()) && p.url() !== page.url()) {
          newTabId = p.url();
          break;
        }
      }

      console.log('[DEBUG][clickByRef] Success', { ref, selector, newTabId });
      return { newTabId };
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][clickByRef] Failed', {
        ref,
        selector,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('click_element', reason, e?.message || 'Click failed', ref);
    }
  }
  /**
   * Fill an input field
   */
  public async fillInput(page: Page, selector: string, value: string): Promise<void> {
    await page.type(selector, value);
  }

  /**
   * Fill input by ref
   * @param selector - CSS selector resolved from ContentHandler.elementRefMap
   */
  public async fillByRef(page: Page, ref: string, selector: string, value: string, wasFromMap?: boolean): Promise<void> {
    // [DEBUG] Log before fill attempt
    console.log('[DEBUG][fillByRef] Start', { ref, selector, value, wasFromMap });
    
    try {
      await page.click(selector);
      await page.keyboard.press('Backspace');
      await page.type(selector, value, { delay: 10 });
      // [DEBUG] Log success
      console.log('[DEBUG][fillByRef] Success', { ref, selector, value });
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      // [DEBUG] Log failure
      console.error('[DEBUG][fillByRef] Failed', {
        ref,
        selector,
        value,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('fill_input', reason, e?.message || 'Fill failed', ref);
    }
  }

  /**
   * Press a key
   */
  public async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key as KeyInput);
  }

  /**
   * Execute JavaScript in the page context.
   * Returns the serializable return value of the script.
   */
  public async evaluateJs(page: Page, script: string): Promise<any> {
    console.log('[DEBUG][evaluateJs] Start', { scriptLength: script.length });

    try {
      const result = await page.evaluate((code: string) => {
        const fn = new Function(code);
        return fn();
      }, script);

      console.log('[DEBUG][evaluateJs] Success', { resultType: typeof result });
      return result;
    } catch (e: any) {
      console.error('[DEBUG][evaluateJs] Failed', {
        error: e?.message || String(e),
      });
      throw createToolError('evaluate_js', 'element_not_found', e?.message || 'Evaluate JS failed');
    }
  }

  /**
   * Upload file through an <input type="file"> element.
   * Returns the file name after successful upload.
   */
  public async uploadFileByRef(
    page: Page,
    ref: string,
    selector: string,
    filePath: string,
    wasFromMap?: boolean,
  ): Promise<string> {
    console.log('[DEBUG][uploadFileByRef] Start', { ref, selector, filePath, wasFromMap });

    try {
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 5000 }),
        page.click(selector),
      ]);
      await fileChooser.accept([filePath]);
      const fileName = filePath.split('/').pop() || filePath;
      console.log('[DEBUG][uploadFileByRef] Success', { ref, fileName });
      return fileName;
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][uploadFileByRef] Failed', {
        ref,
        selector,
        filePath,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('upload_file', reason, e?.message || 'Upload file failed', ref);
    }
  }

  /**
   * Clear input by ref (no new value — only clears existing content)
   */
  public async clearInputByRef(
    page: Page,
    ref: string,
    selector: string,
    wasFromMap?: boolean,
  ): Promise<void> {
    console.log('[DEBUG][clearInputByRef] Start', { ref, selector, wasFromMap });

    try {
      await page.click(selector);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      console.log('[DEBUG][clearInputByRef] Success', { ref, selector });
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][clearInputByRef] Failed', {
        ref,
        selector,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('clear_input', reason, e?.message || 'Clear input failed', ref);
    }
  }

  /**
   * Type text (simulates human typing)
   */
  public async type(page: Page, text: string): Promise<void> {
    await page.keyboard.type(text);
  }

  /**
   * Scroll the page
   */
  public async scroll(
    page: Page,
    direction: 'up' | 'down' | 'top' | 'bottom',
    amount: number = 500
  ): Promise<void> {
    await page.evaluate(({ direction, amount }) => {
      switch (direction) {
        case 'top':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'bottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          break;
        case 'up':
          window.scrollBy({ top: -amount, behavior: 'smooth' });
          break;
        case 'down':
          window.scrollBy({ top: amount, behavior: 'smooth' });
          break;
      }
    }, { direction, amount });
    
    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  /**
   * Scroll to a specific element by ref (with selector resolved)
   * Returns visibility status after scroll.
   */
  public async scrollToElement(
    page: Page,
    ref: string,
    selector: string,
    wasFromMap?: boolean,
  ): Promise<boolean> {
    console.log('[DEBUG][scrollToElement] Start', { ref, selector, wasFromMap });

    try {
      const visible = await page.evaluate((sel: string) => {
        const el = document.querySelector(sel);
        if (!el) {
          throw new Error(`Element not found: ${sel}`);
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        return rect.top >= 0 && rect.top < viewportHeight;
      }, selector);

      // Wait for smooth scroll
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log('[DEBUG][scrollToElement] Success', { ref, selector, visible });
      return visible;
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][scrollToElement] Failed', {
        ref,
        selector,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('scroll_to_element', reason, e?.message || 'Scroll to element failed', ref);
    }
  }

  /**
   * Hover over an element
   */
  public async hover(page: Page, selector: string): Promise<void> {
    await page.hover(selector);
  }

  /**
   * Hover over an element by ref (with selector resolved)
   */
  public async hoverByRef(
    page: Page,
    ref: string,
    selector: string,
    wasFromMap?: boolean,
  ): Promise<void> {
    console.log('[DEBUG][hoverByRef] Start', { ref, selector, wasFromMap });

    try {
      await page.hover(selector);
      console.log('[DEBUG][hoverByRef] Success', { ref, selector });
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][hoverByRef] Failed', {
        ref,
        selector,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('hover', reason, e?.message || 'Hover failed', ref);
    }
  }

  /**
   * Select option from dropdown
   */
  public async selectOption(page: Page, selector: string, value: string): Promise<void> {
    await page.select(selector, value);
  }

  /**
   * Select option by ref (with selector resolved from ContentHandler.elementRefMap)
   * Supports selecting by value attribute or visible label text.
   */
  public async selectOptionByRef(
    page: Page,
    ref: string,
    selector: string,
    value?: string,
    label?: string,
    wasFromMap?: boolean,
  ): Promise<{ value: string; label: string }> {
    console.log('[DEBUG][selectOptionByRef] Start', { ref, selector, value, label });

    try {
      if (value !== undefined) {
        await page.select(selector, value);
        const selectedLabel = await page.$eval(
          selector,
          (el: any, val: string) => {
            const option = Array.from(el.options as HTMLOptionElement[]).find(
              (o: HTMLOptionElement) => o.value === val,
            );
            return option ? option.textContent?.trim() || val : val;
          },
          value,
        );
        console.log('[DEBUG][selectOptionByRef] Success by value', { ref, value, selectedLabel });
        return { value, label: selectedLabel };
      } else if (label !== undefined) {
        // Find option by label text
        const result = await page.evaluate(
          (sel: string, lbl: string) => {
            const select = document.querySelector(sel) as HTMLSelectElement | null;
            if (!select) {
              throw new Error(`Select not found: ${sel}`);
            }
            const option = Array.from(select.options).find(
              (o) => o.textContent?.trim().toLowerCase() === lbl.toLowerCase(),
            );
            if (!option) {
              throw new Error(`Option with label '${lbl}' not found in ${sel}`);
            }
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { value: option.value, label: option.textContent?.trim() || lbl };
          },
          selector,
          label,
        );
        console.log('[DEBUG][selectOptionByRef] Success by label', { ref, result });
        return result;
      }

      throw new Error('Either value or label must be provided');
    } catch (e: any) {
      const reason = classifyError(e, wasFromMap);
      console.error('[DEBUG][selectOptionByRef] Failed', {
        ref,
        selector,
        value,
        label,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('select_option', reason, e?.message || 'Select option failed', ref);
    }
  }

  /**
   * Check a checkbox (Puppeteer doesn't have direct check method)
   */
  public async check(page: Page, selector: string): Promise<void> {
    const isChecked = await page.$eval(selector, (el: any) => el.checked);
    if (!isChecked) {
      await page.click(selector);
    }
  }

  /**
   * Uncheck a checkbox
   */
  public async uncheck(page: Page, selector: string): Promise<void> {
    const isChecked = await page.$eval(selector, (el: any) => el.checked);
    if (isChecked) {
      await page.click(selector);
    }
  }

  /**
   * Wait for element to be visible
   */
  public async waitForElement(page: Page, selector: string, timeout: number = 5000): Promise<void> {
    await page.waitForSelector(selector, { visible: true, timeout });
  }

  /**
   * Wait for a condition to be met (element_visible, element_hidden, text_present, network_idle)
   * Returns waited time in ms.
   */
  public async waitFor(
    page: Page,
    condition: 'element_visible' | 'element_hidden' | 'text_present' | 'network_idle',
    selector?: string,
    text?: string,
    timeoutMs: number = 10000,
  ): Promise<number> {
    const start = Date.now();
    console.log('[DEBUG][waitFor] Start', { condition, selector, text, timeoutMs });

    try {
      switch (condition) {
        case 'element_visible': {
          if (!selector) throw new Error('ref is required for element_visible');
          await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
          break;
        }
        case 'element_hidden': {
          if (!selector) throw new Error('ref is required for element_hidden');
          await page.waitForSelector(selector, { hidden: true, timeout: timeoutMs });
          break;
        }
        case 'text_present': {
          if (!text) throw new Error('text is required for text_present');
          await page.waitForFunction(
            (searchText: string) => document.body.innerText.includes(searchText),
            { timeout: timeoutMs },
            text,
          );
          break;
        }
        case 'network_idle': {
          await page.waitForNetworkIdle({ idleTime: 500, timeout: timeoutMs });
          break;
        }
        default:
          throw new Error(`Unknown condition: ${condition}`);
      }

      const waitedMs = Date.now() - start;
      console.log('[DEBUG][waitFor] Success', { condition, selector, text, waitedMs });
      return waitedMs;
    } catch (e: any) {
      const reason = classifyError(e);
      console.error('[DEBUG][waitFor] Failed', {
        condition,
        selector,
        text,
        reason,
        error: e?.message || String(e),
      });
      throw createToolError('wait_for', reason, e?.message || 'Wait condition failed', selector);
    }
  }

  /**
   * Get element text
   */
  public async getElementText(page: Page, selector: string): Promise<string | null> {
    const element = await page.$(selector);
    if (!element) return null;
    
    return await page.evaluate(el => el.textContent, element);
  }

  /**
   * Get element attribute
   */
  public async getElementAttribute(
    page: Page,
    selector: string,
    attribute: string
  ): Promise<string | null> {
    const element = await page.$(selector);
    if (!element) return null;
    
    return await page.evaluate((el, attr) => el.getAttribute(attr), element, attribute);
  }
}