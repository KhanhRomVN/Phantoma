/**
 * ReconController — Singleton controller for Recon module (Browser reconnaissance)
 *
 * Manages browser sessions using Playwright + fingerprint-chromium
 * Controls browser automation via Playwright MCP
 */

export interface ReconTarget {
  id: string;
  title: string;
  type?: string; // person | website | domain | phone | company | other
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
import { ListTabsHandler } from './handler/ListTabsHandler';
import { CreateTabHandler } from './handler/CreateTabHandler';
import { CloseTabHandler } from './handler/CloseTabHandler';
import { SwitchTabHandler } from './handler/SwitchTabHandler';
import { NavigateHandler } from './handler/NavigateHandler';
import { BackHandler } from './handler/BackHandler';
import { ForwardHandler } from './handler/ForwardHandler';
import { ReloadHandler } from './handler/ReloadHandler';
import { GetPageContentHandler } from './handler/GetPageContentHandler';
import { ListElementsHandler } from './handler/ListElementsHandler';
import { ClickElementHandler } from './handler/ClickElementHandler';
import { FillInputHandler } from './handler/FillInputHandler';
import { PressKeyHandler } from './handler/PressKeyHandler';
import { ScrollHandler } from './handler/ScrollHandler';
import { SelectOptionHandler } from './handler/SelectOptionHandler';
import { WaitForHandler } from './handler/WaitForHandler';
import { ScrollToElementHandler } from './handler/ScrollToElementHandler';
import { ListFramesHandler } from './handler/ListFramesHandler';
import { HoverHandler } from './handler/HoverHandler';
import { ClearInputHandler } from './handler/ClearInputHandler';
import { UploadFileHandler } from './handler/UploadFileHandler';
import { EvaluateJsHandler } from './handler/EvaluateJsHandler';

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
  private selectOptionHandler!: SelectOptionHandler;
  private waitForHandler!: WaitForHandler;
  private scrollToElementHandler!: ScrollToElementHandler;
  private listFramesHandler!: ListFramesHandler;
  private hoverHandler!: HoverHandler;
  private clearInputHandler!: ClearInputHandler;
  private uploadFileHandler!: UploadFileHandler;
  private evaluateJsHandler!: EvaluateJsHandler;
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
    this.selectOptionHandler = new SelectOptionHandler();
    this.waitForHandler = new WaitForHandler();
    this.scrollToElementHandler = new ScrollToElementHandler();
    this.listFramesHandler = new ListFramesHandler();
    this.hoverHandler = new HoverHandler();
    this.clearInputHandler = new ClearInputHandler();
    this.uploadFileHandler = new UploadFileHandler();
    this.evaluateJsHandler = new EvaluateJsHandler();
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
        // Browser lifecycle
        case 'launch_browser': {
          const targetId =
            params.targetId || ReconController.getInstance().getActiveTarget()?.id;
          if (!targetId) {
            return { success: false, error: 'No active target selected.' };
          }
          const result = await ctrl.launchBrowser(targetId, {
            profileUserDataDir: params.profileUserDataDir,
            profileDirectory: params.profileDirectory,
            url: params.url,
          });
          return result;
        }
        case 'close_browser': {
          const targetId =
            params.targetId || ReconController.getInstance().getActiveTarget()?.id;
          if (!targetId) {
            return { success: false, error: 'No active target selected.' };
          }
          return await ctrl.closeBrowser(targetId);
        }

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
            params.waitUntil,
            params.timeoutMs,
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
          const result = await ctrl.getPageContentHandler.handle(
            params.targetId,
            params.tabId,
            params.maxChars,
          );
          return result;
        }
        case 'list_elements': {
          const result = await ctrl.listElementsHandler.handle(
            params.targetId,
            params.tabId,
            params.elementType,
            params.labelContains,
            params.visibleOnly,
            params.limit,
            params.offset,
          );
          return result;
        }
        case 'list_frames': {
          const result = await ctrl.listFramesHandler.handle(params.targetId, params.tabId);
          return result;
        }

        // Page Interaction
        case 'click_element': {
          const result = await ctrl.clickElementHandler.handle(
            params.targetId,
            params.ref,
            params.tabId,
            params.clickType,
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
        case 'select_option': {
          const result = await ctrl.selectOptionHandler.handle(
            params.targetId,
            params.ref,
            params.value,
            params.label,
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
        case 'scroll_to_element': {
          const result = await ctrl.scrollToElementHandler.handle(
            params.targetId,
            params.ref,
            params.tabId,
          );
          return result;
        }
        case 'hover': {
          const result = await ctrl.hoverHandler.handle(params.targetId, params.ref, params.tabId);
          return result;
        }
        case 'clear_input': {
          const result = await ctrl.clearInputHandler.handle(
            params.targetId,
            params.ref,
            params.tabId,
          );
          return result;
        }
        case 'upload_file': {
          const result = await ctrl.uploadFileHandler.handle(
            params.targetId,
            params.ref,
            params.filePath,
            params.tabId,
          );
          return result;
        }
        case 'evaluate_js': {
          const result = await ctrl.evaluateJsHandler.handle(
            params.targetId,
            params.script,
            params.tabId,
          );
          return result;
        }
        case 'wait_for': {
          const result = await ctrl.waitForHandler.handle(
            params.targetId,
            params.condition,
            params.ref,
            params.text,
            params.timeoutMs,
            params.tabId,
          );
          return result;
        }

        // Screenshot
        case 'capture_screenshot': {
          const result = await ctrl.captureScreenshot(
            params.targetId,
            params.tabId,
            params.fullPage,
          );
          return result;
        }

        default:
          return { success: false, error: `Unknown recon tool: ${toolName}` };
      }
    } catch (error: any) {
      console.error('[ReconController.executeTool] Error executing tool:', toolName, error);
      return { success: false, error: error.message || 'Tool execution failed' };
    }
  }

  // ── Target Management ─────────────────────────────────────────────

  /** Nạp danh sách target từ storage (~/.phantoma/recon:{targetId}/_index.recon). */
  public async loadTargets(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('recon:targets:list');
      if (!result.success) return { success: false, error: result.error };

      this.targets.clear();
      for (const record of result.data as Array<{
        id: string;
        title: string;
        targetType: string;
        createdAt: string;
      }>) {
        const existing = this.targets.get(record.id);
        this.targets.set(record.id, {
          id: record.id,
          title: record.title,
          type: record.targetType,
          createdAt: record.createdAt,
          isActive: existing?.isActive ?? false,
          browserPid: existing?.browserPid,
        });
      }
      this.notifyTargetsChanged();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to load targets' };
    }
  }

  /** Tạo target mới: ghi `_index.recon` template rồi thêm vào danh sách. */
  public async createTarget(): Promise<{ success: boolean; data?: ReconTarget; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke('recon:targets:create');
      if (!result.success) return { success: false, error: result.error };

      const record = result.data as {
        id: string;
        title: string;
        targetType: string;
        createdAt: string;
      };
      const target: ReconTarget = {
        id: record.id,
        title: record.title,
        type: record.targetType,
        createdAt: record.createdAt,
        isActive: false,
      };
      this.targets.set(target.id, target);
      this.notifyTargetsChanged();
      return { success: true, data: target };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create target' };
    }
  }

  /** Đọc toàn bộ file `.recon` của một target. */
  public async readTargetFiles(
    targetId: string,
  ): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> {
    try {
      return await (window as any).electron.ipcRenderer.invoke('recon:targets:readFiles', targetId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files' };
    }
  }

  /** Đọc thư mục `files/` của target (text + binary base64). */
  public async readTargetFs(
    targetId: string,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      return await (window as any).electron.ipcRenderer.invoke('recon:targets:readFs', targetId);
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to read target files folder' };
    }
  }

  /** Ghi một file `.recon` của target. */
  public async writeTargetFile(
    targetId: string,
    fileName: string,
    content: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await (window as any).electron.ipcRenderer.invoke('recon:targets:writeFile', {
        targetId,
        fileName,
        content,
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to write target file' };
    }
  }

  /** Xoá target khỏi storage và danh sách. */
  public async deleteTarget(targetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await (window as any).electron.ipcRenderer.invoke(
        'recon:targets:delete',
        targetId,
      );
      if (result.success) this.removeTarget(targetId);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete target' };
    }
  }

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

  public updateTarget(targetId: string, patch: Partial<Omit<ReconTarget, 'id'>>): void {
    const current = this.targets.get(targetId);
    if (!current) return;
    this.targets.set(targetId, { ...current, ...patch });
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
    options?: {
      profileUserDataDir?: string;
      profileDirectory?: string;
      url?: string;
    },
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const target = this.targets.get(targetId);
    if (!target) {
      console.error('[ReconController.launchBrowser] Target not found:', targetId);
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
        email: target.title,
        profileUserDataDir: options?.profileUserDataDir,
        profileDirectory: options?.profileDirectory,
        url: options?.url,
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
            output: `Browser launched for target: ${target.title}`,
            targetId,
            pid: result.data?.pid,
          },
        };
      } else {
        console.error('[ReconController.launchBrowser] IPC call failed:', result.error);
        return { success: false, error: result.error || 'Failed to launch browser' };
      }
    } catch (error: any) {
      console.error('[ReconController.launchBrowser] Exception:', error);
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

  /** Đăng ký callback cập nhật danh sách target. Trả về hàm hủy đăng ký. */
  public onTargetsUpdate(callback: (targets: ReconTarget[]) => void): () => void {
    this.onTargetsChanged = callback;
    return () => {
      // Chỉ gỡ nếu chưa bị callback mới ghi đè
      if (this.onTargetsChanged === callback) this.onTargetsChanged = () => {};
    };
  }

  /** Đăng ký callback đổi active target. Trả về hàm hủy đăng ký. */
  public onActiveTargetUpdate(callback: (targetId: string | null) => void): () => void {
    this.onActiveTargetChanged = callback;
    return () => {
      if (this.onActiveTargetChanged === callback) this.onActiveTargetChanged = () => {};
    };
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

  public async captureScreenshot(
    targetId: string,
    tabId?: string,
    fullPage?: boolean,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const session = this.sessions.get(targetId);
    if (!session) {
      return { success: false, error: 'No active browser session for this target' };
    }

    try {
      const result = await (window as any).electron.ipcRenderer.invoke('browser:screenshot', {
        targetId,
        tabId,
        fullPage,
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to capture screenshot' };
    }
  }
}
