/**
 * ------------------------------------------------------------------
 * IPC Target Lock Handlers
 * ------------------------------------------------------------------
 * Theo dõi "target" mà mỗi cửa sổ đang thao tác (theo từng module) để
 * phát hiện 2 cửa sổ cùng thao tác 1 target. Main chỉ lưu và phát lại
 * trạng thái; mỗi module ở renderer tự quyết định cách xử lý xung đột.
 *
 * Channels:
 * - target:claim          : (module, targetId | null) cửa sổ gửi yêu cầu đặt/bỏ target
 * - target:get-state      : Trả về { windowId, claims } hiện tại
 * - target:force-release  : (module, targetId) yêu cầu các cửa sổ KHÁC bỏ target này
 *
 * Events (main → renderer):
 * - target:claims-changed : Danh sách claims mới (gửi tới mọi cửa sổ)
 * - target:force-release  : { module, targetId } gửi tới cửa sổ đang giữ target
 *
 * Functions:
 * - setupTargetLockHandlers() : Entry point đăng ký IPC handler nhóm 'target:'
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app, BrowserWindow, ipcMain } from 'electron';

// ─── Types ──────────────────────────────────────────────────────────────
interface TargetClaim {
  windowId: number;
  module: string;
  targetId: string;
  /** Thứ tự claim toàn cục — nhỏ hơn = claim trước */
  seq: number;
}

// ─── State ──────────────────────────────────────────────────────────────
/** windowId → (module → { targetId, seq }) */
const claimsByWindow = new Map<number, Map<string, { targetId: string; seq: number }>>();
let claimSeq = 0;

// ─── Helpers ────────────────────────────────────────────────────────────
function snapshot(): TargetClaim[] {
  const result: TargetClaim[] = [];
  claimsByWindow.forEach((modules, windowId) => {
    modules.forEach((claim, module) =>
      result.push({ windowId, module, targetId: claim.targetId, seq: claim.seq }),
    );
  });
  return result;
}

function broadcast(): void {
  const claims = snapshot();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send('target:claims-changed', claims);
  });
}

function dropWindow(windowId: number): void {
  if (claimsByWindow.delete(windowId)) broadcast();
}

// ─── Functions ──────────────────────────────────────────────────────────
export function setupTargetLockHandlers(): void {
  app.on('browser-window-created', (_event, win) => {
    const id = win.id;
    win.on('closed', () => dropWindow(id));
    // Reload renderer → state phía renderer bị reset, bỏ claim cũ
    win.webContents.on('did-start-loading', () => dropWindow(id));
  });

  ipcMain.handle('target:claim', (event, module: string, targetId: string | null) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const modules = claimsByWindow.get(win.id) ?? new Map<string, { targetId: string; seq: number }>();
    if (targetId) {
      if (modules.get(module)?.targetId !== targetId) modules.set(module, { targetId, seq: ++claimSeq });
    } else modules.delete(module);
    if (modules.size > 0) claimsByWindow.set(win.id, modules);
    else claimsByWindow.delete(win.id);
    broadcast();
  });

  ipcMain.handle('target:get-state', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return { windowId: win?.id ?? -1, claims: snapshot() };
  });

  ipcMain.handle('target:focus-owner', (event, module: string, targetId: string) => {
    const self = BrowserWindow.fromWebContents(event.sender);
    for (const [windowId, modules] of claimsByWindow) {
      if (windowId === self?.id || modules.get(module)?.targetId !== targetId) continue;
      const other = BrowserWindow.fromId(windowId);
      if (!other || other.isDestroyed()) continue;
      if (other.isMinimized()) other.restore();
      if (!other.isVisible()) other.show();
      if (process.platform === 'darwin') app.focus({ steal: true });
      other.focus();
      return true;
    }
    return false;
  });

  ipcMain.handle('target:close-owner', (event, module: string, targetId: string) => {
    const self = BrowserWindow.fromWebContents(event.sender);
    claimsByWindow.forEach((modules, windowId) => {
      if (windowId === self?.id || modules.get(module)?.targetId !== targetId) return;
      const other = BrowserWindow.fromId(windowId);
      if (other && !other.isDestroyed()) other.close();
    });
  });

  ipcMain.handle('target:force-release', (event, module: string, targetId: string) => {
    const self = BrowserWindow.fromWebContents(event.sender);
    claimsByWindow.forEach((modules, windowId) => {
      if (windowId === self?.id || modules.get(module)?.targetId !== targetId) return;
      const other = BrowserWindow.fromId(windowId);
      if (other && !other.isDestroyed()) {
        other.webContents.send('target:force-release', { module, targetId });
      }
    });
  });
}
