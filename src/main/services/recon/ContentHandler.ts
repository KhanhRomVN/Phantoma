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
   * Enhanced to preserve structure and context for AI understanding
   */
  private async extractMarkdown(page: Page): Promise<string> {
    const content = await page.evaluate(() => {
      const markdown: string[] = [];
      
      // Helper: check if element is visible
      const isVisible = (el: Element): boolean => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        );
      };

      // Helper: get clean text (trim and remove extra whitespace)
      const cleanText = (text: string | null | undefined): string => {
        if (!text) return '';
        return text.trim().replace(/\s+/g, ' ');
      };

      // Helper: recursively process DOM tree
      const processNode = (node: Element, depth: number = 0): void => {
        // Skip invisible elements
        if (!isVisible(node)) return;

        // Skip script, style, noscript tags
        const tag = node.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'svg', 'iframe'].includes(tag)) {
          return;
        }

        const indent = '  '.repeat(depth);

        switch (tag) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const level = parseInt(tag[1]);
            const text = cleanText(node.textContent);
            if (text) {
              markdown.push(`${'#'.repeat(level)} ${text}\n`);
            }
            break;
          }

          case 'p': {
            const text = cleanText(node.textContent);
            if (text) {
              markdown.push(`${text}\n`);
            }
            break;
          }

          case 'a': {
            const text = cleanText(node.textContent);
            const href = (node as HTMLAnchorElement).href;
            if (text && href) {
              markdown.push(`[${text}](${href}) `);
            }
            break;
          }

          case 'ul':
          case 'ol': {
            const items = Array.from(node.children).filter(
              (child) => child.tagName.toLowerCase() === 'li'
            );
            items.forEach((item, idx) => {
              const text = cleanText(item.textContent);
              if (text) {
                const prefix = tag === 'ul' ? '-' : `${idx + 1}.`;
                markdown.push(`${indent}${prefix} ${text}\n`);
              }
            });
            markdown.push('\n');
            break;
          }

          case 'blockquote': {
            const text = cleanText(node.textContent);
            if (text) {
              markdown.push(`> ${text}\n\n`);
            }
            break;
          }

          case 'code': {
            const text = cleanText(node.textContent);
            if (text) {
              markdown.push(`\`${text}\``);
            }
            break;
          }

          case 'pre': {
            const code = node.querySelector('code');
            const text = cleanText(code?.textContent || node.textContent);
            if (text) {
              markdown.push(`\`\`\`\n${text}\n\`\`\`\n\n`);
            }
            break;
          }

          case 'hr': {
            markdown.push('---\n\n');
            break;
          }

          case 'br': {
            markdown.push('\n');
            break;
          }

          case 'div':
          case 'section':
          case 'article':
          case 'main':
          case 'aside':
          case 'nav':
          case 'header':
          case 'footer': {
            // For container elements, process children recursively
            Array.from(node.children).forEach((child) => {
              processNode(child, depth + 1);
            });
            break;
          }

          case 'table': {
            // Basic table support
            const rows = Array.from(node.querySelectorAll('tr'));
            if (rows.length > 0) {
              rows.forEach((row, rowIdx) => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                const cellTexts = cells.map((cell) => cleanText(cell.textContent));
                if (cellTexts.some((t) => t)) {
                  markdown.push(`| ${cellTexts.join(' | ')} |\n`);
                }
                // Add separator after header row
                if (rowIdx === 0 && row.querySelector('th')) {
                  markdown.push(`| ${cells.map(() => '---').join(' | ')} |\n`);
                }
              });
              markdown.push('\n');
            }
            break;
          }

          default: {
            // For other elements, just extract text if there's any direct text content
            const directText = Array.from(node.childNodes)
              .filter((child) => child.nodeType === Node.TEXT_NODE)
              .map((child) => cleanText(child.textContent))
              .filter((text) => text)
              .join(' ');

            if (directText) {
              markdown.push(`${directText} `);
            }

            // Process children
            Array.from(node.children).forEach((child) => {
              processNode(child, depth);
            });
            break;
          }
        }
      };

      // Start from main content areas (prioritize semantic HTML)
      const mainContent =
        document.querySelector('main') ||
        document.querySelector('article') ||
        document.querySelector('[role="main"]') ||
        document.body;

      if (mainContent) {
        processNode(mainContent);
      }

      // Clean up result
      let result = markdown.join('').trim();
      
      // Remove excessive newlines
      result = result.replace(/\n{3,}/g, '\n\n');
      
      // Limit length to avoid token overflow
      const maxLength = 15000;
      if (result.length > maxLength) {
        result = result.substring(0, maxLength) + '\n\n[Content truncated...]';
      }

      return result || '(No content extracted)';
    });

    return content;
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
   * Extract input elements (only visible and interactable)
   */
  private async extractInputs(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const isVisible = (el: HTMLElement): boolean => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          !el.disabled
        );
      };

      const inputs = Array.from(document.querySelectorAll('input')).filter((input) =>
        isVisible(input)
      );

      return inputs.slice(0, 50).map((input, idx) => {
        // Try to find a good label
        let label = '';
        
        // 1. Check for associated label
        if (input.labels && input.labels.length > 0) {
          label = input.labels[0].textContent?.trim() || '';
        }
        
        // 2. Check aria-label
        if (!label && input.getAttribute('aria-label')) {
          label = input.getAttribute('aria-label') || '';
        }
        
        // 3. Check placeholder
        if (!label && input.placeholder) {
          label = input.placeholder;
        }
        
        // 4. Check name attribute
        if (!label && input.name) {
          label = input.name.replace(/[-_]/g, ' ');
        }
        
        // 5. Check parent label
        if (!label) {
          const parentLabel = input.closest('label');
          if (parentLabel) {
            label = parentLabel.textContent?.trim() || '';
          }
        }

        const id = input.id || input.name || `input-${idx}`;

        return {
          ref: id,
          type: 'input' as const,
          selector: input.id
            ? `#${input.id}`
            : input.name
            ? `input[name="${input.name}"]`
            : `input[type="${input.type}"]:nth-of-type(${idx + 1})`,
          label: label || `Input ${input.type}`,
          value: input.value,
          placeholder: input.placeholder,
        };
      });
    });
  }

  /**
   * Extract button elements (only visible and clickable)
   */
  private async extractButtons(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const isVisible = (el: HTMLElement): boolean => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          !el.disabled
        );
      };

      const buttons = Array.from(
        document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]')
      ).filter((button) => isVisible(button as HTMLElement));

      return buttons.slice(0, 50).map((button, idx) => {
        let text = '';
        
        // Get button text
        if (button.tagName === 'INPUT') {
          text = (button as HTMLInputElement).value;
        } else {
          text = button.textContent?.trim() || '';
        }
        
        // Check aria-label if no text
        if (!text && button.getAttribute('aria-label')) {
          text = button.getAttribute('aria-label') || '';
        }
        
        // Check title if still no text
        if (!text && button.getAttribute('title')) {
          text = button.getAttribute('title') || '';
        }

        const id = button.id || `btn-${idx}`;

        return {
          ref: id,
          type: 'button' as const,
          selector: button.id
            ? `#${button.id}`
            : `button:nth-of-type(${idx + 1})`,
          text: text || 'Unnamed button',
        };
      });
    });
  }

  /**
   * Extract link elements (only visible and meaningful)
   */
  private async extractLinks(page: Page): Promise<InteractiveElement[]> {
    return await page.evaluate(() => {
      const isVisible = (el: HTMLElement): boolean => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        );
      };

      const links = Array.from(document.querySelectorAll('a[href]')).filter((link) =>
        isVisible(link as HTMLElement)
      );

      // Filter out navigation/footer links, keep only meaningful ones
      const meaningfulLinks = links.filter((link) => {
        const text = link.textContent?.trim() || '';
        const href = (link as HTMLAnchorElement).href;
        
        // Skip empty links, javascript: links, and hash-only links
        if (!text || href.startsWith('javascript:') || href.endsWith('#')) {
          return false;
        }
        
        // Skip very short text (likely icons or navigation)
        if (text.length < 3) {
          return false;
        }
        
        return true;
      });

      return meaningfulLinks.slice(0, 30).map((link, idx) => {
        const text = link.textContent?.trim() || '';
        const href = (link as HTMLAnchorElement).href;
        const id = link.id || `link-${idx}`;

        return {
          ref: id,
          type: 'link' as const,
          selector: link.id ? `#${link.id}` : `a[href="${href}"]:nth-of-type(${idx + 1})`,
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
