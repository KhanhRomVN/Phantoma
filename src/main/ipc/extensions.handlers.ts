/**
 * Extensions IPC Handlers
 * 
 * Handle VS Code extension installation from Open VSX Registry.
 * Downloads .vsix files, extracts, and loads into monaco-vscode-api.
 */

import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as https from 'https';
const AdmZip = require('adm-zip');

// ─── Extension Storage ──────────────────────────────────────────────────────

const EXTENSIONS_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.phantoma', 'extensions');

/**
 * Ensure extensions directory exists
 */
async function ensureExtensionsDir(): Promise<void> {
  try {
    await fs.mkdir(EXTENSIONS_DIR, { recursive: true });
  } catch (error) {
    console.error('[Extensions] Failed to create extensions directory:', error);
  }
}

/**
 * Get installed extensions list
 */
async function getInstalledExtensions(): Promise<string[]> {
  try {
    await ensureExtensionsDir();
    console.log('[Extensions][DEBUG] Reading extensions dir:', EXTENSIONS_DIR);
    const entries = await fs.readdir(EXTENSIONS_DIR);
    console.log('[Extensions][DEBUG] Raw entries:', JSON.stringify(entries));
    const filtered = entries.filter((entry) => !entry.startsWith('.'));
    console.log('[Extensions][DEBUG] Filtered (no dotfiles):', JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('[Extensions] Failed to read extensions directory:', error);
    return [];
  }
}

/**
 * Download file from URL
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        if (response.headers.location) {
          file.close();
          downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        reject(new Error('Failed to download: ' + response.statusCode));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err: Error) => {
        file.close();
        fs.unlink(dest).catch(() => {});
        reject(err);
      });
    }).on('error', (err: Error) => {
      file.close();
      fs.unlink(dest).catch(() => {});
      reject(err);
    });
  });
}

// ─── Extension Installation ─────────────────────────────────────────────────

async function installExtension(extensionId: string, downloadUrl?: string): Promise<void> {
  console.log('[Extensions] Installing ' + extensionId + '...');

  try {
    await ensureExtensionsDir();

    const extensionDir = path.join(EXTENSIONS_DIR, extensionId);
    const vsixPath = path.join(EXTENSIONS_DIR, extensionId + '.vsix');

    if (downloadUrl) {
      console.log('[Extensions] Downloading from ' + downloadUrl + '...');
      await downloadFile(downloadUrl, vsixPath);
      console.log('[Extensions] Downloaded .vsix file');
    } else {
      throw new Error('Download URL is required');
    }

    console.log('[Extensions] Extracting .vsix file...');
    const zip = new AdmZip(vsixPath);
    zip.extractAllTo(extensionDir, true);
    console.log('[Extensions] Extracted to ' + extensionDir);

    const packageJsonPath = path.join(extensionDir, 'extension', 'package.json');
    let metadata: any = { id: extensionId };

    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      metadata = {
        id: extensionId,
        name: packageJson.name,
        displayName: packageJson.displayName || packageJson.name,
        version: packageJson.version,
        publisher: packageJson.publisher,
        description: packageJson.description,
        installedAt: new Date().toISOString(),
        enabled: true,
      };
    } catch (err) {
      console.warn('[Extensions] Could not read package.json, using minimal metadata');
    }

    await fs.writeFile(
      path.join(extensionDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
    );

    await fs.unlink(vsixPath).catch(() => {});

    console.log('[Extensions] Installed ' + extensionId);
  } catch (error) {
    console.error('[Extensions] Failed to install ' + extensionId + ':', error);
    throw error;
  }
}

async function uninstallExtension(extensionId: string): Promise<void> {
  console.log('[Extensions] Uninstalling ' + extensionId + '...');

  try {
    const extensionDir = path.join(EXTENSIONS_DIR, extensionId);
    await fs.rm(extensionDir, { recursive: true, force: true });
    console.log('[Extensions] Uninstalled ' + extensionId);
  } catch (error) {
    console.error('[Extensions] Failed to uninstall ' + extensionId + ':', error);
    throw error;
  }
}

async function toggleExtension(extensionId: string, enabled: boolean): Promise<void> {
  console.log('[Extensions] Toggling ' + extensionId + ' to ' + (enabled ? 'enabled' : 'disabled') + '...');

  try {
    const extensionDir = path.join(EXTENSIONS_DIR, extensionId);
    const metadataPath = path.join(extensionDir, 'metadata.json');

    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    metadata.enabled = enabled;

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log('[Extensions] Toggled ' + extensionId);
  } catch (error) {
    console.error('[Extensions] Failed to toggle ' + extensionId + ':', error);
    throw error;
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

export function registerExtensionsHandlers(): void {
  ipcMain.handle('extensions:install', async (_event, { extensionId, downloadUrl }) => {
    await installExtension(extensionId, downloadUrl);
    return { success: true };
  });

  ipcMain.handle('extensions:uninstall', async (_event, { extensionId }) => {
    await uninstallExtension(extensionId);
    return { success: true };
  });

  ipcMain.handle('extensions:toggle', async (_event, { extensionId, enabled }) => {
    await toggleExtension(extensionId, enabled);
    return { success: true };
  });

  ipcMain.handle('extensions:list', async () => {
    const extensions = await getInstalledExtensions();
    return { extensions };
  });

  console.log('[Extensions] IPC handlers registered');
}