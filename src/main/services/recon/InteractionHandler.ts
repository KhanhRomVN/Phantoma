/**
 * InteractionHandler — Handle page interactions for browser automation
 * 
 * This handler manages user interactions including clicking elements,
 * filling inputs, pressing keys, and scrolling.
 */

import type { Page } from 'puppeteer';

export class InteractionHandler {
  /**
   * Click an element by selector
   */
  public async clickElement(page: Page, selector: string): Promise<void> {
    await page.click(selector);
  }

  /**
   * Click an element by ref (need to get selector first from ContentHandler)
   */
  public async clickByRef(page: Page, ref: string): Promise<void> {
    // Try common ID selector first
    const selector = ref.startsWith('#') ? ref : `#${ref}`;
    
    try {
      await page.click(selector, { timeout: 5000 });
    } catch {
      // If ID doesn't work, try as text content
      try {
        await page.click(`text/${ref}`, { timeout: 5000 });
      } catch {
        // Try XPath for text
        const elements = await page.$x(`//*[contains(text(), '${ref}')]`);
        if (elements.length > 0) {
          await elements[0].click();
        } else {
          throw new Error(`Element not found: ${ref}`);
        }
      }
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
   */
  public async fillByRef(page: Page, ref: string, value: string): Promise<void> {
    const selector = ref.startsWith('#') ? ref : `#${ref}`;
    
    try {
      // Clear first then type
      await page.click(selector, { clickCount: 3 }); // Select all
      await page.keyboard.press('Backspace');
      await page.type(selector, value, { delay: 10 });
    } catch {
      // Try as placeholder
      await page.type(`[placeholder="${ref}"]`, value, { delay: 10 });
    }
  }

  /**
   * Press a key
   */
  public async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
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
    await page.waitForTimeout(300);
  }

  /**
   * Hover over an element
   */
  public async hover(page: Page, selector: string): Promise<void> {
    await page.hover(selector);
  }

  /**
   * Select option from dropdown
   */
  public async selectOption(page: Page, selector: string, value: string): Promise<void> {
    await page.select(selector, value);
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
