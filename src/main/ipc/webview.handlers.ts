/**
 * ------------------------------------------------------------------
 * IPC Workspace & Embedded Browser Handlers
 * ------------------------------------------------------------------
 * Quản lý các thành phần giao diện nâng cao của Workbench. Bao gồm:
 * 1. Embedded Web Views (BrowserView): Nhúng trình duyệt con vào ứng dụng
 *    để hiển thị web content độc lập với Renderer process (cho mục đích
 *    isolation hoặc rendering hiệu suất cao). Xử lý sync bounds, lifecycle
 *    và điều hướng.
 * 2. Markdown Export: Chuyển đổi nội dung Markdown sang PDF sử dụng
 *    hidden window và engine printToPDF.
 *
 * Constants:
 * - browserViews : Map lưu trữ instance BrowserView theo ID duy nhất
 * - lastBounds   : Cache kích thước cuối cùng để restore sau khi ẩn tạm thời
 *
 * Channels:
 * - browser:create            : Instantiate và attach một BrowserView mới vào window
 * - browser:destroy           : Detach và dispose resources của một BrowserView
 * - browser:set-bounds        : Sync CSS coordinates từ renderer sang native bounds
 * - browser:set-device-metrics: Mô phỏng viewport thiết bị di động (iPhone/Pixel...)
 * - browser:force-repaint     : Ép compositor render lại frame (fix white screen bug)
 * - browser:navigate          : Load URL mới trong embedded browser
 * - browser:go-back           : Lịch sử lùi
 * - browser:go-forward        : Lịch sử tiến
 * - browser:reload            : Refresh trang hiện tại
 * - browser:open-external     : Mở link trong trình duyệt hệ thống mặc định
 * - markdown:export-pdf       : Render HTML từ MD và xuất ra file PDF qua dialog save
 *
 * Functions:
 * - registerWorkspaceHandlers() : Entry point đăng ký IPC handler nhóm 'browser:' và 'markdown:'
 * ------------------------------------------------------------------
 */

import { ipcMain, BrowserView, shell, BrowserWindow, net } from 'electron';
import * as fs from 'fs';

// Store active BrowserViews
const browserViews = new Map<string, BrowserView>();

// Bounds cuối cùng của từng view — dùng để restore sau khi tạm ẩn
// (ví dụ khi mở dropdown "+" bị native layer che).
const lastBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

export function registerWorkspaceHandlers() {
  // ─── Browser View Handlers ──────────────────────────────────────────

  ipcMain.handle('browser:create', async (event, { browserId, url }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        throw new Error('Window not found');
      }

      // Create BrowserView
      const view = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });

      // Store reference
      browserViews.set(browserId, view);

      // Add to window
      win.addBrowserView(view);

      // Auto-resize theo window — renderer sẽ override bằng bounds chính xác
      // qua 'browser:set-bounds' ngay sau khi mount (ResizeObserver).
      view.setAutoResize({ width: true, height: true });

      // Bounds tạm thời (sẽ bị renderer thay thế ngay). Đặt nhỏ để tránh
      // flash phủ toàn màn hình trước khi renderer báo vị trí thật.
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });

      view.webContents.on('page-title-updated', (_e, title) => {
        event.sender.send('browser:title-updated', { browserId, title });
      });

      view.webContents.on('page-favicon-updated', async (_e, favicons) => {
        const faviconUrl = favicons?.[0] ?? null;
        let favicon: string | null = null;
        if (faviconUrl) {
          try {
            const res = await net.fetch(faviconUrl);
            if (res.ok) {
              const type = res.headers.get('content-type') ?? 'image/x-icon';
              const buf = Buffer.from(await res.arrayBuffer());
              favicon = `data:${type};base64,${buf.toString('base64')}`;
            }
          } catch {
            favicon = null;
          }
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send('browser:favicon-updated', { browserId, favicon });
        }
      });

      // Load URL
      await view.webContents.loadURL(url);

      // Setup event listeners
      view.webContents.on('did-navigate', (_e, navUrl) => {
        event.sender.send('browser:did-navigate', { browserId, url: navUrl });
      });

      view.webContents.on('did-navigate-in-page', (_e, navUrl) => {
        event.sender.send('browser:did-navigate', { browserId, url: navUrl });
      });

      view.webContents.on('did-start-loading', () => {
        event.sender.send('browser:load-start', { browserId });
      });

      view.webContents.on('did-stop-loading', () => {
        event.sender.send('browser:load-stop', { browserId });

        // Send navigation state
        event.sender.send('browser:navigation-state-changed', {
          browserId,
          canGoBack: view.webContents.canGoBack(),
          canGoForward: view.webContents.canGoForward(),
        });
      });

      return { success: true, browserId };
    } catch (error: any) {
      console.error('[browser:create] Error:', error);
      return { error: error.message };
    }
  });

  ipcMain.on('browser:destroy', (event, browserId: string) => {
    try {
      const view = browserViews.get(browserId);
      if (!view) return;

      // Remove khỏi đúng window đang chứa view (không hard-code window[0])
      const ownerWin =
        BrowserWindow.fromWebContents(event.sender) ||
        BrowserWindow.getAllWindows().find((w) => w.getBrowserViews().includes(view));
      if (ownerWin) {
        ownerWin.removeBrowserView(view);
      }

      try {
        (view.webContents as any).clearDeviceMetricsOverride?.();
      } catch {
        /* noop */
      }

      // Destroy view
      (view.webContents as any).destroy();
      browserViews.delete(browserId);
      lastBounds.delete(browserId);
    } catch (error) {
      console.error('[browser:destroy] Error:', error);
    }
  });

  // Renderer gửi bounds (CSS pixel) của vùng chứa BrowserView → map sang
  // coordinate hệ window (device-independent px) rồi set cho BrowserView.
  // BrowserView là native layer nằm TRÊN web content nên bắt buộc phải sync
  // thủ công kiểu này; nếu không nó sẽ phủ toàn cửa sổ thay vì chỉ vùng chứa.
  ipcMain.on('browser:set-bounds', (event, { browserId, bounds }) => {
    const view = browserViews.get(browserId);
    if (!view) return;

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const zoomFactor = event.sender.getZoomFactor() || 1;
    const finalBounds = {
      x: Math.round(bounds.x * zoomFactor),
      y: Math.round(bounds.y * zoomFactor),
      width: Math.round(bounds.width * zoomFactor),
      height: Math.round(bounds.height * zoomFactor),
    };
    view.setBounds(finalBounds);

    // Ghi nhớ bounds thật (bỏ qua trạng thái ẩn 0×0) để restore sau này
    if (finalBounds.width > 0 && finalBounds.height > 0) {
      lastBounds.set(browserId, finalBounds);
    }
  });

  // NOTE: Việc tạm ẩn / khôi phục BrowserView khi mở dropdown "+" được xử lý
  // HOÀN TOÀN ở renderer bằng CustomEvent ('phantoma:overlay-open' / 'closed').
  // Lý do: BrowserView là native layer Electron nằm TRÊN web content nên mọi
  // dropdown DOM đều bị che bất kể z-index → phải co bounds về 0×0 khi overlay
  // mở và re-sync qua getBoundingClientRect() khi overlay đóng. Làm qua IPC
  // global (hide-all/restore-all) gây bug trắng xóa vì bounds restore có thể
  // stale hoặc web contents bị suspend khi bounds = 0 quá lâu.

  // Device metrics override — mô phỏng viewport của thiết bị nổi tiếng
  // (iPhone, iPad, Pixel…). width=0 → clear override, trở về responsive.
  ipcMain.on(
    'browser:set-device-metrics',
    (_event, { browserId, width, height, deviceScaleFactor, mobile }) => {
      const view = browserViews.get(browserId);
      if (!view) return;

      try {
        const wc = view.webContents as any;
        if (!width || !height) {
          wc.clearDeviceMetricsOverride();
        } else {
          wc.setDeviceMetricsOverride({
            width,
            height,
            deviceScaleFactor: deviceScaleFactor || 1,
            mobile: !!mobile,
          });
        }
      } catch (error) {
        console.error('[browser:set-device-metrics] Error:', error);
      }
    },
  );

  // Force repaint cho BrowserView sau khi bounds được restore từ trạng thái
  // ẩn (0×0). Electron có thể suspend paint pipeline khi view invisible quá
  // ngắn → frame cuối cùng bị "đóng băng" thành màu trắng. invalidate() ép
  // compositor render lại frame mới ngay lập tức.
  ipcMain.on('browser:force-repaint', (_event, browserId: string) => {
    const view = browserViews.get(browserId);
    if (!view) return;
    try {
      const wc = view.webContents as any;
      if (typeof wc.invalidate === 'function') {
        wc.invalidate();
      } else if (typeof wc.forceRepaint === 'function') {
        wc.forceRepaint();
      }
    } catch (error) {
      console.error('[browser:force-repaint] Error:', error);
    }
  });

  ipcMain.on('browser:navigate', (_event, { browserId, url }) => {
    const view = browserViews.get(browserId);
    if (view) {
      view.webContents.loadURL(url).catch((err) => {
        console.error('[browser:navigate] Error:', err);
      });
    }
  });

  ipcMain.on('browser:go-back', (_event, browserId: string) => {
    const view = browserViews.get(browserId);
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack();
    }
  });

  ipcMain.on('browser:go-forward', (_event, browserId: string) => {
    const view = browserViews.get(browserId);
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward();
    }
  });

  ipcMain.on('browser:reload', (_event, browserId: string) => {
    const view = browserViews.get(browserId);
    if (view) {
      view.webContents.reload();
    }
  });

  ipcMain.on('browser:open-external', (_event, url: string) => {
    shell.openExternal(url).catch((err) => {
      console.error('[browser:open-external] Error:', err);
    });
  });

  // ─── Markdown Export PDF Handler ────────────────────────────────────

  ipcMain.handle('markdown:export-pdf', async (event, { content, filename }) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        throw new Error('Window not found');
      }

      // Dynamic import marked (ESM package)
      const { marked } = await import('marked');

      // Convert markdown to HTML
      const html = await marked(content);

      // Create styled HTML document
      const styledHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    code {
      background-color: #f6f8fa;
      border-radius: 3px;
      font-size: 85%;
      margin: 0;
      padding: 0.2em 0.4em;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    pre {
      background-color: #f6f8fa;
      border-radius: 3px;
      font-size: 85%;
      line-height: 1.45;
      overflow: auto;
      padding: 16px;
    }
    blockquote {
      border-left: 4px solid #dfe2e5;
      color: #6a737d;
      padding: 0 15px;
      margin: 0;
    }
    img {
      max-width: 100%;
    }
    a {
      color: #0366d6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul, ol {
      padding-left: 2em;
    }
    li {
      margin-bottom: 0.25em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    table th, table td {
      border: 1px solid #eaecef;
      padding: 6px 13px;
    }
    table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
      `;

      // Create hidden window for PDF generation
      const pdfWin = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
        },
      });

      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);

      // Show save dialog
      const { dialog } = require('electron');
      const { filePath } = await dialog.showSaveDialog(win, {
        defaultPath: filename,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (filePath) {
        // Generate PDF
        const data = await pdfWin.webContents.printToPDF({
          margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
          printBackground: true,
        });

        // Write to file
        fs.writeFileSync(filePath, data);

        pdfWin.destroy();
        return { success: true, path: filePath };
      } else {
        pdfWin.destroy();
        return { cancelled: true };
      }
    } catch (error: any) {
      console.error('[markdown:export-pdf] Error:', error);
      return { error: error.message };
    }
  });
}