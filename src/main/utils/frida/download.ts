import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { app } from 'electron';

const execAsync = promisify(exec);

// Frida server download URLs by architecture
export const FRIDA_VERSION = '17.5.2';
export const FRIDA_DOWNLOAD_URLS: Record<string, string> = {
  arm: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-arm.xz`,
  arm64: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-arm64.xz`,
  x86: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-x86.xz`,
  x86_64: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-x86_64.xz`,
};

/**
 * Get Frida server storage path
 */
export function getFridaServerPath(architecture: string): string {
  const fridaDir = path.join(app.getPath('userData'), 'frida-servers');
  fs.mkdirSync(fridaDir, { recursive: true });
  return path.join(fridaDir, `frida-server-${architecture}`);
}

/**
 * Download and extract Frida server for specific architecture
 */
export async function downloadFridaServer(
  architecture: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const url = FRIDA_DOWNLOAD_URLS[architecture];
  if (!url) {
    throw new Error(`Unsupported architecture: ${architecture}`);
  }

  const serverPath = getFridaServerPath(architecture);

  // Check if already downloaded
  if (fs.existsSync(serverPath)) {
    return serverPath;
  }

  const xzPath = serverPath + '.xz';

  // Download the compressed file
  const downloadFile = (downloadUrl: string, destination: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      https
        .get(downloadUrl, (response) => {
          // Handle Redirects
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 303 ||
            response.statusCode === 307
          ) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              file.close();
              downloadFile(redirectUrl, destination).then(resolve).catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (onProgress && totalSize > 0) {
              onProgress(Math.round((downloadedSize / totalSize) * 100));
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          try {
            file.close();
          } catch {
            // Ignore errors
          }
          try {
            fs.unlinkSync(destination);
          } catch {
            // Ignore errors
          }
          reject(err);
        });
    });
  };

  await downloadFile(url, xzPath);

  // Decompress with xz
  try {
    await execAsync(`xz -d "${xzPath}"`);
    // Make executable
    fs.chmodSync(serverPath, 0o755);
    return serverPath;
  } catch (error) {
    throw new Error(`Failed to decompress Frida server: ${error}`);
  }
}