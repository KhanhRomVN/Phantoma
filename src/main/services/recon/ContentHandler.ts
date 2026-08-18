/**
 * ContentHandler — Handle content extraction for browser automation
 * 
 * This handler manages extracting page content, converting to markdown,
 * and listing interactive elements with references for AI interaction.
 */

import type { Page } from 'puppeteer';

export interface PageContent {
  title: string;
  url: string;
  markdown: string;
  elements: InteractiveElement[];
}

export interface InteractiveElement {
  ref: string;
  type: 'input' | 'button' | 'link' | 'select' | 'textarea';
  selector: string;
  label?: string;
  value?: string;
  placeholder?: string;
  text?: string;
  href?: string;
}

export class ContentHandler {
  private elementRefMap: Map<string, string> = new Map(); // ref -> selector

  /**
   * Get page content as markdown with interactive elements
   */
  public async getPageContent(page: Page): Promise<PageContent> {
    const title = await page.title();
    const url = page.url();
    
    // Extract page content as markdown
    const markdown = await this.extractMarkdown(page);
    
    // Extract interactive elements
    const elements = await this.extractInteractiveElements(page);
    
    return {
      title,
      url,
      markdown,
      elements,
    };
  }

  /**
   * Extract page content as markdown
   */
  private async extractMarkdown(page: Page): Promise<string> {
    // Use Playwright to get the page content and convert to markdown
    const content = await page.evaluate(() => {
      // Simple markdown conversion (can be enhanced with turndown.js)
      const body = document.body;
      const markdown: string[] = [];
      
      // Extract headings
      const headings = body.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(h => {
        const level = parseInt(h.tagName[1]);
        const prefix = '#'.repeat(level);
        markdown.push(`${prefix} ${h.textContent?.trim()}\n`);
      });
      
      // Extract paragraphs
      const paragraphs = body.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent?.trim();
        if (text) {
          markdown.push(`${text}\n`);
        }
      });
      
      // Extract lists
      const lists = body.querySelectorAll('ul, ol');
      lists.forEach(list => {
        const items = list.querySelectorAll('li');
        items.forEach(item => {
          const prefix = list.tagName === 'UL' ? '-' : '1.';
          markdown.push(`${prefix} ${item.textContent?.trim()}\n`);
        });
      });
      
      return markdown.join('\n');
    });
    
    return content || '(No content extracted)';
  }

  /**
   * Extract interactive elements from the page
   */
  private async extractInteractiveElements(page: Page): Promise<InteractiveElement[]> {
    const elements: InteractiveElement[] = [];
    this.elementRefMap.clear();
    
    // Extract inputs
    const inputs = await this.extractInputs(page);
    elements.push(...inputs);
    
    // Extract buttons
    const buttons = await this.extractButtons(page);
    elements.push(...buttons);
    
    // Extract links
    const links = await this.extractLinks(page);
    elements.push(...links);
    
    // Extract selects
    const selects = await this.extractSelects(page);
    elements.push(...selects);
    
    // Extract textareas
    const textareas = await this.extractTextareas(page);
    elements.push(...textareas);
    
    return elements;
  }

  /**
   * Extract input elements
   */
  private async extractInputs(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((input, idx) => {
        const id = input.id || `input-${idx}`;
        const label = input.labels?.[0]?.textContent?.trim() || input.name || input.placeholder;
        
        return {
          ref: id,
          type: 'input' as const,
          selector: input.id ? `#${input.id}` : `input[type="${input.type}"]:nth-of-type(${idx + 1})`,
          label,
          value: input.value,
          placeholder: input.placeholder,
        };
      });
    });
  }

  /**
   * Extract button elements
   */
  private async extractButtons(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
      return buttons.map((button, idx) => {
        const id = button.id || `btn-${idx}`;
        const text = button.textContent?.trim() || (button as HTMLInputElement).value;
        
        return {
          ref: id,
          type: 'button' as const,
          selector: button.id ? `#${button.id}` : `button:nth-of-type(${idx + 1})`,
          text,
        };
      });
    });
  }

  /**
   * Extract link elements
   */
  private async extractLinks(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links.slice(0, 20).map((link, idx) => { // Limit to 20 links
        const id = link.id || `link-${idx}`;
        const text = link.textContent?.trim();
        const href = (link as HTMLAnchorElement).href;
        
        return {
          ref: id,
          type: 'link' as const,
          selector: link.id ? `#${link.id}` : `a[href]:nth-of-type(${idx + 1})`,
          text,
          href,
        };
      });
    });
  }

  /**
   * Extract select elements
   */
  private async extractSelects(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map((select, idx) => {
        const id = select.id || `select-${idx}`;
        const label = select.labels?.[0]?.textContent?.trim() || select.name;
        
        return {
          ref: id,
          type: 'select' as const,
          selector: select.id ? `#${select.id}` : `select:nth-of-type(${idx + 1})`,
          label,
          value: select.value,
        };
      });
    });
  }

  /**
   * Extract textarea elements
   */
  private async extractTextareas(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('textarea'));
      return textareas.map((textarea, idx) => {
        const id = textarea.id || `textarea-${idx}`;
        const label = textarea.labels?.[0]?.textContent?.trim() || textarea.name || textarea.placeholder;
        
        return {
          ref: id,
          type: 'textarea' as const,
          selector: textarea.id ? `#${textarea.id}` : `textarea:nth-of-type(${idx + 1})`,
          label,
          value: textarea.value,
          placeholder: textarea.placeholder,
        };
      });
    });
  }

  /**
   * List elements by type
   */
  public async listElements(page: Page, elementType?: string): Promise<InteractiveElement[]> {
    const content = await this.getPageContent(page);
    
    if (!elementType) {
      return content.elements;
    }
    
    return content.elements.filter(el => el.type === elementType);
  }

  /**
   * Get selector by ref
   */
  public getSelectorByRef(ref: string): string | undefined {
    return this.elementRefMap.get(ref);
  }
}
