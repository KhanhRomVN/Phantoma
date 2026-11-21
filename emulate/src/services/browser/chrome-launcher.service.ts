/**
 * ------------------------------------------------------------------
 * Chrome Launcher Service
 * ------------------------------------------------------------------
 * Launches Chrome/Chromium with a remote-debugging port so the CDP
 * service can attach to it. Handles profile selection: a private
 * profile per target by default, or a clone of a real Chrome profile
 * when the user asks to reuse their data.
 *
 * Main exports:
 * - chromeLauncherService.launch(options) : Spawn Chrome, wait until the debug port is ready
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
// ── External
import * as fs from 'fs';
import { spawn } from 'child_process';

// ── Local
import {
  CDP_READY_POLL_INTERVAL_MS,
  CDP_READY_TIMEOUT_MS,
  CHROME_CLONE_SKIP_NAMES,
  CHROME_EXECUTABLE_PATHS,
  CHROME_PROFILE_DIR_PATTERN,
} from '../../constants';
import { getCdpProfilesDir } from '../../config/paths.config';
import { createLogger } from '../../utils/logger.util';
import { findFreePort } from '../../utils/network.util';
import { sleep } from '../../utils/async.util';
import { processManager } from '../runtime/process-manager.service';
import type { ChromeLaunchOptions, ChromeLaunchResult } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────
const logger = createLogger('ChromeLauncher');

interface ResolvedProfile {
  userDataDir: string;
  /** Set when the user picked a sub-profile ("Default", "Profile N"). */
  profileDirectory?: string;
}

// ─── Service ───────────────────────────────────────────────────────────

class ChromeLauncherService {
  /**
   * Launches Chrome for a target and resolves once the debug port answers.
   * @throws Error with a user-facing message when Chrome cannot be started.
   */
  async launch(options: ChromeLaunchOptions): Promise<ChromeLaunchResult> {
    const { targetId, proxyUrl, customUrl, userDataDir: requestedUserDataDir } = options;

    // 1. Determine URL to open
    const urlToOpen = customUrl || proxyUrl || 'about:blank';

    // 2. Find a FREE PORT dynamically to avoid conflict with Electron/Vite dev server
    let debugPort: number;
    try {
      debugPort = await findFreePort();
    } catch {
      throw new Error('Failed to allocate a free debugging port.');
    }

    // 3. Find Chrome executable
    const chromePath = this.findChromeExecutable();
    if (!chromePath) {
      throw new Error('Chrome/Chromium executable not found in standard paths.');
    }

    // 4. Resolve the profile to use
    const { userDataDir, profileDirectory } = await this.resolveProfile(targetId, requestedUserDataDir);

    // 5. Spawn the process
    const args = [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      ...(profileDirectory ? [`--profile-directory=${profileDirectory}`] : []),
      '--no-first-run',
      '--no-default-browser-check',
      // ASSUMED: profile riêng của target dùng mock keyring để key mã hóa Cookies ổn định giữa các lần mở (giống temp/Zentri launch.ts); profile clone từ Chrome thật giữ keyring gốc để giải mã được cookie cũ
      ...(profileDirectory ? [] : ['--password-store=basic', '--use-mock-keychain']),
      urlToOpen,
    ];

    const child = spawn(chromePath, args, {
      detached: true, // Detach from parent so it keeps running even if server restarts
      stdio: 'ignore',
    });

    child.on('error', (e) => logger.error('Chrome child process error', { err: String(e) }));
    let childExited = false;
    child.on('exit', () => {
      childExited = true;
    });

    child.unref(); // Allow Node.js to exit independently

    // Register process with central manager
    if (child.pid) {
      processManager.register(targetId, child.pid, debugPort);
    }

    // Wait for the debug port (Chrome window opened) before responding
    const readyDeadline = Date.now() + CDP_READY_TIMEOUT_MS;
    while (!childExited && Date.now() < readyDeadline) {
      try {
        const probe = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (probe.ok) break;
      } catch {
        // port chưa mở, thử lại
      }
      await sleep(CDP_READY_POLL_INTERVAL_MS);
    }

    if (childExited) {
      throw new Error(
        'Chrome thoát ngay sau khi khởi động (profile đang bị Chrome khác dùng hoặc bị chặn remote debugging).',
      );
    }

    return { debugPort, pid: child.pid, url: urlToOpen };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private findChromeExecutable(): string {
    for (const p of CHROME_EXECUTABLE_PATHS) {
      if (fs.existsSync(p)) return p;
    }
    return '';
  }

  /**
   * Decides which user-data-dir (and optional profile) Chrome should use.
   * ASSUMED: path dạng "<base>/Default" hoặc "<base>/Profile N" là profile con của Chrome user-data-dir
   */
  private async resolveProfile(targetId: string, requested?: unknown): Promise<ResolvedProfile> {
    let userDataDir = `${getCdpProfilesDir()}/${targetId}/default`;
    fs.mkdirSync(userDataDir, { recursive: true });
    let profileDirectory: string | undefined;

    if (typeof requested === 'string' && requested.trim()) {
      const cleaned = requested.trim().replace(/[\\/]+$/, '');
      const sepIdx = Math.max(cleaned.lastIndexOf('/'), cleaned.lastIndexOf('\\'));
      const baseName = cleaned.slice(sepIdx + 1);
      if (sepIdx > 0 && CHROME_PROFILE_DIR_PATTERN.test(baseName)) {
        userDataDir = cleaned.slice(0, sepIdx);
        profileDirectory = baseName;
      } else {
        userDataDir = cleaned;
      }
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
    }

    if (profileDirectory) {
      userDataDir = await this.cloneProfile(targetId, userDataDir, profileDirectory);
    }

    return { userDataDir, profileDirectory };
  }

  /**
   * ASSUMED: Chrome bỏ qua --remote-debugging-port với user-data-dir mặc định và Chrome đang chạy giữ lock profile
   * → clone profile sang thư mục riêng (bỏ qua cache). Returns the clone root.
   */
  private async cloneProfile(targetId: string, sourceRoot: string, profileDirectory: string): Promise<string> {
    const cloneRoot = `${getCdpProfilesDir()}/${targetId}/clone`;
    const alreadyCloned = fs.existsSync(`${cloneRoot}/${profileDirectory}`);
    const copyFilter = (src: string) => !CHROME_CLONE_SKIP_NAMES.has(src.slice(src.lastIndexOf('/') + 1));

    if (!alreadyCloned) {
      await fs.promises.mkdir(cloneRoot, { recursive: true });
      if (fs.existsSync(`${sourceRoot}/Local State`)) {
        await fs.promises.copyFile(`${sourceRoot}/Local State`, `${cloneRoot}/Local State`);
      }
      await fs.promises.cp(`${sourceRoot}/${profileDirectory}`, `${cloneRoot}/${profileDirectory}`, {
        recursive: true,
        force: true,
        filter: copyFilter,
      });
    }
    return cloneRoot;
  }
}

export const chromeLauncherService = new ChromeLauncherService();
