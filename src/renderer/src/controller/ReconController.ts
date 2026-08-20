/**
 * ReconController — Singleton controller for Recon module (Browser reconnaissance)
 *
 * Manages browser sessions using Playwright + fingerprint-chromium
 * Controls browser automation via Playwright MCP
 */

export interface ReconTarget {
  id: string;
  email: string;
  createdAt: string;
  browserPid?: number;
  isActive: boolean;
}

export interface BrowserSession {
  targetId: string;
  browser: any; // Playwright Browser instance
  context: any; // Playwright BrowserContext
  page: any; // Playwright Page
  pid?: number;
}

// ── Handler imports ────────────────────────────────────────────────
import { ListTabsHandler } from '../modules/Recon/handler/ListTabsHandler';
import { CreateTabHandler } from '../modules/Recon/handler/CreateTabHandler';
import { CloseTabHandler } from '../modules/Recon/handler/CloseTabHandler';
import { SwitchTabHandler } from '../modules/Recon/handler/SwitchTabHandler';
import { NavigateHandler } from '../modules/Recon/handler/NavigateHandler';
import { BackHandler } from '../modules/Recon/handler/BackHandler';
import { ForwardHandler } from '../modules/Recon/handler/ForwardHandler';
import { ReloadHandler } from '../modules/Recon/handler/ReloadHandler';
import { GetPageContentHandler } from '../modules/Recon/handler/GetPageContentHandler';
import { ListElementsHandler } from '../modules/Recon/handler/ListElementsHandler';
import { ClickElementHandler } from '../modules/Recon/handler/ClickElementHandler';
import { FillInputHandler } from '../modules/Recon/handler/FillInputHandler';
import { PressKeyHandler } from '../modules/Recon/handler/PressKeyHandler';
import { ScrollHandler } from '../modules/Recon/handler/ScrollHandler';
import { logger } from '@renderer/utils/logger';

export class ReconController {
  private static instance: ReconController;

  private targets: Map<string, ReconTarget> = new Map();
  private sessions: Map<string, BrowserSession> = new Map();
  private activeTargetId: string | null = null;

  // Handlers for recon tools
  private listTabsHandler!: ListTabsHandler;
  private createTabHandler!: CreateTabHandler;
  private closeTabHandler!: CloseTabHandler;
  private switchTabHandler!: SwitchTabHandler;
  private navigateHandler!: NavigateHandler;
  private backHandler!: BackHandler;
  private forwardHandler!: ForwardHandler;
  private reloadHandler!: ReloadHandler;
  private getPageContentHandler!: GetPageContentHandler;
  private listElementsHandler!: ListElementsHandler;
  private clickElementHandler!: ClickElementHandler;
  private fillInputHandler!: FillInputHandler;
  private pressKeyHandler!: PressKeyHandler;
  private scrollHandler!: ScrollHandler;

  // Callbacks for UI updates
  private onTargetsChanged: ((targets: ReconTarget[]) => void) | null = null;
  private onActiveTargetChanged: ((targetId: string | null) => void) | null = null;

  private constructor() {
    this.listTabsHandler = new ListTabsHandler();
    this.createTabHandler = new CreateTabHandler();
    this.closeTabHandler = new CloseTabHandler();
    this.switchTabHandler = new SwitchTabHandler();
    this.navigateHandler = new NavigateHandler();
    this.backHandler = new BackHandler();
    this.forwardHandler = new ForwardHandler();
    this.reloadHandler = new ReloadHandler();
    this.getPageContentHandler = new GetPageContentHandler();
    this.listElementsHandler = new ListElementsHandler();
    this.clickElementHandler = new ClickElementHandler();
    this.fillInputHandler = new FillInputHandler();
    this.pressKeyHandler = new PressKeyHandler();
    this.scrollHandler = new ScrollHandler();
  }

  // ── Singleton ─────────────────────────────────────────────────────

  public static getInstance(): ReconController {
    if (!ReconController.instance) {
      ReconController.instance = new ReconController();
    }
    return ReconController.instance;
  }

  // ── Static: execute tool (for Agent tool-executors) ──────────────

  public static async executeTool(
    toolName: string,
    params: Record<string, any> = {},
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const ctrl = ReconController.getInstance();

    try {
      switch (toolName) {
        // Tab Management
        case 'list_tabs': {
          const result = await ctrl.listTabsHandler.handle(params.targetId);
          return result;
        }
        case 'create_tab': {
          const result = await ctrl.createTabHandler.handle(params.targetId, params.url);
          return result;
        }
        case 'close_tab': {
          const result = await ctrl.closeTabHandler.handle(params.targetId, params.tabId);
          return result;
        }
        case 'switch_tab': {
          const result = await ctrl.switchTabHandler.handle(params.targetId, params.tabId);
          return result;
        }

        // Navigation
        case 'navigate': {
          const result = await ctrl.navigateHandler.handle(
            params.targetId,
            params.url,
            params.tabId,
          );
          return result;
        }
        case 'back': {
          const result = await ctrl.backHandler.handle(params.targetId, params.tabId);
          return result;
        }
        case 'forward': {
          const result = await ctrl.forwardHandler.handle(params.targetId, params.tabId);
          return result;
        }
        case 'reload': {
          const result = await ctrl.reloadHandler.handle(params.targetId, params.tabId);
          return result;
        }

        // Content Extraction
        case 'get_page_content': {
          const result = await ctrl.getPageContentHandler.handle(params.targetId, params.tabId);
          return result;
        }
        case 'list_elements': {
          const result = await ctrl.listElementsHandler.handle(
            params.targetId,
            params.tabId,
            params.elementType,
          );
          return result;
        }

        // Page Interaction
        case 'click_element': {
          const result = await ctrl.clickElementHandler.handle(
            params.targetId,
            params.ref,
            params.tabId,
          );
          return result;
        }
        case 'fill_input': {
          const result = await ctrl.fillInputHandler.handle(
            params.targetId,
            params.ref,
            params.value,
            params.tabId,
          );
          return result;
        }
        case 'press_key': {
          const result = await ctrl.pressKeyHandler.handle(
            params.targetId,
            params.key,
            params.tabId,
          );
          return result;
        }
        case 'scroll': {
          const result = await ctrl.scrollHandler.handle(
            params.targetId,
            params.direction,
            params.amount,
            params.tabId,
          );
          return result;
        }

        default:
          return { success: false, error: `Unknown recon tool: ${toolName}` };
      }
    } catch (error: any) {
      logger.error('[ReconController.executeTool] Error executing tool:', toolName, error);
      return { success: false, error: error.message || 'Tool execution failed' };
    }
  }

  // ── Target Management ─────────────────────────────────────────────

  public setTargets(targets: ReconTarget[]): void {
    this.targets.clear();
    targets.forEach((target) => {
      this.targets.set(target.id, target);
    });
    this.notifyTargetsChanged();
  }

  public addTarget(target: ReconTarget): void {
    this.targets.set(target.id, target);
    this.notifyTargetsChanged();
  }

  public removeTarget(targetId: string): void {
    this.targets.delete(targetId);
    this.sessions.delete(targetId);
    if (this.activeTargetId === targetId) {
      this.setActiveTarget(null);
    }
    this.notifyTargetsChanged();
  }

  public getTargets(): ReconTarget[] {
    return Array.from(this.targets.values());
  }

  public getTarget(targetId: string): ReconTarget | undefined {
    return this.targets.get(targetId);
  }

  // ── Active Target ─────────────────────────────────────────────────

  public setActiveTarget(targetId: string | null): void {
    this.activeTargetId = targetId;
    this.notifyActiveTargetChanged();
  }

  public getActiveTarget(): ReconTarget | null {
    if (!this.activeTargetId) return null;
    return this.targets.get(this.activeTargetId) || null;
  }

  // ── Browser Session Management ────────────────────────────────────

  public async launchBrowser(
    targetId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const target = this.targets.get(targetId);
    if (!target) {
      logger.error('[ReconController.launchBrowser] Target not found:', targetId);
      return { success: false, error: `Target not found: ${targetId}` };
    }

    // Check if already running
    if (this.sessions.has(targetId)) {
      return { success: false, error: 'Browser already running for this target' };
    }

    try {
      // Call IPC to launch browser in main process
      const result = await (window as any).electron.ipcRenderer.invoke('browser:launch', {
        targetId,
        email: target.email,
      });

      if (result.success) {
        // Store session info
        const session: BrowserSession = {
          targetId,
          browser: null, // Browser object is in main process
          context: null,
          page: null,
          pid: result.data?.pid,
        };

        this.sessions.set(targetId, session);

        // Update target status
        target.isActive = true;
        target.browserPid = result.data?.pid;
        this.notifyTargetsChanged();

        return {
          success: true,
          data: {
            output: `Browser launched for target: ${target.email}`,
            targetId,
            pid: result.data?.pid,
          },
        };
      } else {
        logger.error('[ReconController.launchBrowser] IPC call failed:', result.error);
        return { success: false, error: result.error || 'Failed to launch browser' };
      }
    } catch (error: any) {
      logger.error('[ReconController.launchBrowser] Exception:', error);
      return { success: false, error: error.message || 'Failed to launch browser' };
    }
  }

  public async closeBrowser(
    targetId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      // Call IPC to close browser in main process
      const result = await (window as any).electron.ipcRenderer.invoke('browser:close', targetId);

      if (result.success) {
        // Remove from sessions
        this.sessions.delete(targetId);

        // Update target status
        const target = this.targets.get(targetId);
        if (target) {
          target.isActive = false;
          target.browserPid = undefined;
          this.notifyTargetsChanged();
        }

        return {
          success: true,
          data: { output: `Browser closed for target: ${targetId}` },
        };
      } else {
        return { success: false, error: result.error || 'Failed to close browser' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to close browser' };
    }
  }

  public getSession(targetId: string): BrowserSession | undefined {
    return this.sessions.get(targetId);
  }

  // ── Callbacks ─────────────────────────────────────────────────────

  public onTargetsUpdate(callback: (targets: ReconTarget[]) => void): void {
    this.onTargetsChanged = callback;
  }

  public onActiveTargetUpdate(callback: (targetId: string | null) => void): void {
    this.onActiveTargetChanged = callback;
  }

  private notifyTargetsChanged(): void {
    if (this.onTargetsChanged) {
      this.onTargetsChanged(this.getTargets());
    }
  }

  private notifyActiveTargetChanged(): void {
    if (this.onActiveTargetChanged) {
      this.onActiveTargetChanged(this.activeTargetId);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────

  public reset(): void {
    this.targets.clear();
    this.sessions.clear();
    this.activeTargetId = null;
    this.onTargetsChanged = null;
    this.onActiveTargetChanged = null;
  }

  // ── Tab Management ────────────────────────────────────────────────

  public async listTabs(
    targetId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke(
        'browser:listTabs',
        targetId,
      );
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list tabs' };
    }
  }

  public async createTab(
    targetId: string,
    url?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:createTab', {
        targetId,
        url,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create tab' };
    }
  }

  public async closeTab(
    targetId: string,
    tabId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:closeTab', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to close tab' };
    }
  }

  public async switchTab(
    targetId: string,
    tabId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:switchTab', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to switch tab' };
    }
  }

  // ── Navigation ────────────────────────────────────────────────────

  public async navigate(
    targetId: string,
    url: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:navigate', {
        targetId,
        url,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate' };
    }
  }

  public async back(
    targetId: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:back', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate back' };
    }
  }

  public async forward(
    targetId: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:forward', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to navigate forward' };
    }
  }

  public async reload(
    targetId: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:reload', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reload page' };
    }
  }

  // ── Content Extraction ────────────────────────────────────────────

  public async getPageContent(
    targetId: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:getPageContent', {
        targetId,
        tabId,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to get page content' };
    }
  }

  public async listElements(
    targetId: string,
    tabId?: string,
    elementType?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:listElements', {
        targetId,
        tabId,
        elementType,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to list elements' };
    }
  }

  // ── Page Interaction ──────────────────────────────────────────────

  public async clickElement(
    targetId: string,
    ref: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:clickElement', {
        targetId,
        tabId,
        ref,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to click element' };
    }
  }

  public async fillInput(
    targetId: string,
    ref: string,
    value: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:fillInput', {
        targetId,
        tabId,
        ref,
        value,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fill input' };
    }
  }

  public async pressKey(
    targetId: string,
    key: string,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:pressKey', {
        targetId,
        tabId,
        key,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to press key' };
    }
  }

  public async scroll(
    targetId: string,
    direction: 'up' | 'down' | 'top' | 'bottom',
    amount?: number,
    tabId?: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:scroll', {
        targetId,
        tabId,
        direction,
        amount,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to scroll' };
    }
  }
}
