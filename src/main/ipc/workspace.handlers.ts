import { ipcMain, BrowserView, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Store active BrowserViews
const browserViews = new Map<string, BrowserView>();

export function registerWorkspaceHandlers() {
  // Browser View Handlers
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

      // Set bounds (will be updated by renderer)
      const bounds = win.getContentBounds();
      view.setBounds({
        x: 0,
        y: 40, // Account for toolbar height
        width: bounds.width,
        height: bounds.height - 40,
      });

      // Load URL
      await view.webContents.loadURL(url);

      // Setup event listeners
      view.webContents.on('did-navigate', (_event, url) => {
        event.sender.send('browser:did-navigate', { browserId, url });
      });

      view.webContents.on('did-navigate-in-page', (_event, url) => {
        event.sender.send('browser:did-navigate', { browserId, url });
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
    } catch (error) {
      console.error('[browser:create] Error:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('browser:destroy', async (_event, browserId: string) => {
    try {
      const view = browserViews.get(browserId);
      if (view) {
        // Remove from window
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.removeBrowserView(view);
        }
        
        // Destroy view
        // @ts-ignore - destroy exists but not in types
        view.webContents.destroy();
        browserViews.delete(browserId);
      }
      return { success: true };
    } catch (error) {
      console.error('[browser:destroy] Error:', error);
      return { error: error.message };
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

  // Markdown Export PDF Handler
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
      border: 1px solid #dfe2e5;
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
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
        ],
      });

      if (filePath) {
        // Generate PDF
        const data = await pdfWin.webContents.printToPDF({
          margins: {
            top: 0.5,
            bottom: 0.5,
            left: 0.5,
            right: 0.5,
          },
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
    } catch (error) {
      console.error('[markdown:export-pdf] Error:', error);
      return { error: error.message };
    }
  });
}
