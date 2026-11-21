/**
 * ------------------------------------------------------------------
 * eBPF Capture Service
 * ------------------------------------------------------------------
 * Orchestrates the eBPF TLS sniffer for the API layer:
 *  - generic capture (optionally filtered by PID)
 *  - CLI capture: launch a CLI target in a terminal and attach the
 *    sniffer to its PID
 *
 * It also remembers which CLI target owns the sniffer so terminating
 * that target stops the sniffer as well.
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import { AppError } from '../../errors/app.error';
import { createLogger, F } from '../../utils/logger.util';
import { sleep } from '../../utils/async.util';
import { launchInTerminal } from './terminal-launcher.service';
import { resolveLivePid, resolveTlsBinary } from './tls-target-resolver.service';
import { ebpfSniffer } from './ebpf-sniffer.service';
import { processManager } from '../runtime/process-manager.service';
import { wssHub } from '../realtime/wss-hub.service';

// ─── Constants ─────────────────────────────────────────────────────────
const logger = createLogger('EbpfCapture');

/** ecapture runs via sudo and may exit right after spawn — wait briefly to catch that. */
const EARLY_EXIT_GRACE_MS = 1500;

export interface CliCaptureInput {
  targetId: string;
  /** Full command line stored for the CLI target. */
  executablePath: string;
  sudoPassword?: string;
  platform?: string;
}

// ─── Service ───────────────────────────────────────────────────────────

class EbpfCaptureService {
  /** CLI target currently owning the sniffer (so /terminate stops the right one). */
  private ownerTargetId: string | null = null;

  isRunning(): boolean {
    return ebpfSniffer.getStatus();
  }

  /** Start a generic capture, optionally filtered by PID. Resolves false if it failed to start. */
  async startGeneric(pid?: number): Promise<boolean> {
    const started = await ebpfSniffer.start({ pid });
    if (started) this.forwardEventsToHub();
    return started;
  }

  stopGeneric(): void {
    ebpfSniffer.stop();
  }

  /**
   * Launch a CLI target in a terminal and attach the eBPF sniffer to its PID.
   * @throws AppError 409 when a sniffer/target is already running, 500 when capture fails.
   */
  async startCli(input: CliCaptureInput): Promise<{ pid: number }> {
    const { targetId, executablePath, sudoPassword, platform } = input;

    if (ebpfSniffer.getStatus()) {
      throw new AppError('eBPF sniffer is already running. Stop it first.', 409);
    }
    if (processManager.getActiveTargets().some((t) => t.targetId === targetId && t.alive)) {
      throw new AppError(`Target ${targetId} is already running`, 409);
    }

    let started = false;
    let earlyError = '';
    let pid: number;

    try {
      // Opens a visible terminal window; pid is the real CLI process (exec) that ecapture attaches to.
      // Single simple command only — upgrade path: parse the command line to support pipes and &&.
      pid = await launchInTerminal(executablePath, platform !== 'application');
      processManager.register(targetId, pid, 0);

      // Drop old listeners first so restarts do not duplicate forwarded events
      this.forwardEventsToHub();

      const captureEarlyError = (e: { message?: string }) => {
        earlyError = e?.message || earlyError;
      };
      ebpfSniffer.on('ebpf:error', captureEarlyError);

      try {
        const live = await resolveLivePid(pid, executablePath);
        const libssl = await resolveTlsBinary(live.exe ?? executablePath);
        logger.debug(
          'Attaching eBPF sniffer',
          F('target', targetId),
          F('launcherPid', pid),
          F('pid', live.pid),
          F('libssl', libssl ?? 'none'),
          F('cmd', executablePath),
        );
        started = await ebpfSniffer.start({ pid: live.pid, sudoPassword, libssl });
        await sleep(EARLY_EXIT_GRACE_MS);
      } finally {
        ebpfSniffer.off('ebpf:error', captureEarlyError);
      }
    } catch (err) {
      await processManager.terminate(targetId).catch(() => false);
      throw err;
    }

    if (!started || !ebpfSniffer.getStatus()) {
      await processManager.terminate(targetId);
      throw new AppError(
        earlyError ||
          'ecapture failed to start or exited immediately. Check that ecapture is installed and sudo works without a password.',
        500,
      );
    }

    this.ownerTargetId = targetId;
    return { pid };
  }

  /** Stop the sniffer and terminate the CLI target process. */
  async stopCli(targetId: string): Promise<void> {
    ebpfSniffer.stop();
    this.ownerTargetId = null;
    await processManager.terminate(targetId);
  }

  /**
   * Called after a runtime terminate: stops the sniffer if the terminated
   * target (or "all targets") includes the one that owns it.
   */
  releaseIfOwner(targetId?: string): void {
    if (this.ownerTargetId && (!targetId || targetId === this.ownerTargetId)) {
      ebpfSniffer.stop();
      this.ownerTargetId = null;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /** Forward sniffer events to the WebSocket hub (idempotent: never duplicates listeners). */
  private forwardEventsToHub(): void {
    ebpfSniffer.removeAllListeners('ebpf:data');
    ebpfSniffer.removeAllListeners('ebpf:error');
    ebpfSniffer.on('ebpf:data', (event) => {
      wssHub.broadcast({ type: 'ebpf:https-event', data: event });
    });
    ebpfSniffer.on('ebpf:error', (errorData) => {
      wssHub.broadcast({ type: 'ebpf:error', data: errorData });
    });
  }
}

export const ebpfCaptureService = new EbpfCaptureService();
