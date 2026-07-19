import { BrowserWindow, ipcMain } from 'electron';

export function setupWindowHandlers(): void {
  // Minimize window
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.minimize();
    }
  });

  // Maximize window
  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.maximize();
    }
  });

  // Unmaximize window (restore)
  ipcMain.handle('window:unmaximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.unmaximize();
    }
  });

  // Close window
  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
  });

  // Check if window is maximized
  ipcMain.handle('window:isMaximized', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      return win.isMaximized();
    }
    return false;
  });
}