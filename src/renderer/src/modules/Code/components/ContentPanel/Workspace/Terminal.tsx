import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SerializeAddon } from 'xterm-addon-serialize';
import 'xterm/css/xterm.css';
import {
  detectAgentFromCommandLine,
  detectAgentFromTitle,
  extractOscTitles,
  TuiAgentId,
} from '../../../utils/ai-agent-detector';

/** Resolve a CSS custom property like "--sidebar-background: R G B" to "#RRGGBB". */
const resolveCssRgbVarToHex = (varName: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/).map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return fallback;
  const [r, g, b] = parts;
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';
import { Copy, ClipboardPaste, SquareMousePointer, Trash2, PowerOff, Zap } from 'lucide-react';

interface CodeTerminalProps {
  projectId?: string;
  panelId?: string;
  cwd?: string;
  onProviderChange?: (providerId: string | null, status?: 'running' | 'idle') => void;

  // ── NEW: ZenCLI Auto-Resume Support ──
  /** Lệnh shell để tự động gõ ngay sau khi PTY spawn xong. Dùng cho auto-resume ZenCLI. */
  initialCommand?: string | null;
  /** Callback khi user thoát process (exit event từ main process). */
  onProcessExit?: () => void;
  /** Callback khi phát hiện [PHANTOMA_BIND] signal từ stdout/stderr của ZenCLI. */
  onBindConversation?: (conversationId: string) => void;
  /** Callback khi phát hiện [PHANTOMA_RESET] signal từ stdout/stderr của ZenCLI (user gõ /new). */
  onResetConversation?: () => void;
}

export const CodeTerminal = ({
  panelId,
  cwd,
  onProviderChange,
  initialCommand,
  onProcessExit,
  onBindConversation,
  onResetConversation,
}: CodeTerminalProps) => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>(
    `code-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [, setIsInitialized] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number } | null>(null);
  // Track if shell has been spawned to prevent double-spawn on re-render/resize
  const hasSpawnedRef = useRef(false);
  const panelIdRef = useRef(panelId);
  panelIdRef.current = panelId;
  const saveHistoryRef = useRef<(() => void) | null>(null);

  // State for detected AI agent (used for UI display if needed elsewhere, though mostly driven by signals now)
  const [_detectedAgent, setDetectedAgent] = useState<TuiAgentId | null>(null);

  // ── NEW: Ref to persist the last known agent ID across renders/signals ──
  // This solves the issue where `detectedAgent` state might be null when a signal arrives
  // due to async updates or resets.
  const lastKnownAgentIdRef = useRef<string | null>(null);

  // Ref to hold the latest onProviderChange callback to avoid stale closures and unnecessary effect triggers
  const onProviderChangeRef = useRef(onProviderChange);

  // Update ref whenever prop changes (without triggering effects that depend on it)
  useEffect(() => {
    onProviderChangeRef.current = onProviderChange;
  }, [onProviderChange]);

  // Notify parent when provider changes
  // REMOVED: We no longer auto-notify on detectedAgent change.
  // Badge visibility is now strictly controlled by [PHANTOMA_STATUS] signals in onData handler.
  // This prevents the badge from appearing immediately upon CLI launch (Idle state).

  useEffect(() => {
    terminalIdRef.current = `code-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log('[DEBUG] CodeTerminal effect start', {
      terminalId: terminalIdRef.current,
      cwd,
      hasSpawned: hasSpawnedRef.current,
    });
    let cleanupFunctions: (() => void)[] = [];
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let term: XTerm | null = null;
    let fitAddon: FitAddon | null = null;
    let isOpened = false;

    const HISTORY_SCROLLBACK = 5000;
    const persistHistory = !initialCommand;
    const serializeAddon = new SerializeAddon();
    let historyReady = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const saveHistory = () => {
      if (!persistHistory || !historyReady || !term) return;
      if (term.buffer.active.type === 'alternate') return;
      window.api?.send('terminal:history-save', {
        panelId: panelIdRef.current,
        data: serializeAddon.serialize({ scrollback: HISTORY_SCROLLBACK }),
      });
    };
    const scheduleSave = () => {
      if (!persistHistory) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveHistory, 1500);
    };
    saveHistoryRef.current = saveHistory;
    window.addEventListener('beforeunload', saveHistory);
    cleanupFunctions.push(() => window.removeEventListener('beforeunload', saveHistory));

    const createTerminalInstance = () => {
      const sidebarBg = resolveCssRgbVarToHex('--sidebar-background', '#1a1b1e');
      term = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        theme: {
          background: sidebarBg,
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selectionBackground: '#264f78',
        },
        // Disable convertEol to allow proper rendering of ANSI escape codes
        // and control characters like \r (carriage return) used by shells
        // for features like reverse-i-search (^R).
        convertEol: false,
        disableStdin: false,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
    };

    const safeFit = () => {
      if (!fitAddon || !term || !isMounted || !termRef.current) return;
      if (termRef.current.offsetWidth <= 0 || termRef.current.offsetHeight <= 0) return;

      try {
        fitAddon.fit();
        if (window.api?.send) {
          const { cols, rows } = term;
          if (cols > 0 && rows > 0) {
            window.api.send('terminal:resize', {
              terminalId: terminalIdRef.current,
              cols,
              rows,
            });
          }
        }
      } catch (e) {
        // Ignore transient fit errors
      }
    };

    const setupIPCAndSpawn = () => {
      if (!term || !fitAddon) return;

      // Setup IPC listeners
      if (window.api?.on) {
        const onData = (_event: any, payload: { terminalId: string; data: string }) => {
          if (payload.terminalId === terminalIdRef.current && term) {
            term.write(payload.data);
            scheduleSave();

            // --- AI Agent Detection Logic ---

            // 1. Detect via OSC Titles in the stream
            const titles = extractOscTitles(payload.data);
            if (titles.length > 0) {
              for (const title of titles) {
                const agentFromTitle = detectAgentFromTitle(title);
                if (agentFromTitle) {
                  setDetectedAgent(agentFromTitle);
                  break; // Found one, stop processing this chunk's titles
                }
              }
            }

            // ── NEW: Parse [PHANTOMA_BIND] signal from ZenCLI stderr ──
            // Format expected: \x1b[0m[PHANTOMA_BIND] id=<uuid>\n
            const bindMatch = payload.data.match(/\[PHANTOMA_BIND\]\s+id=([a-fA-F0-9\-]+)/i);
            if (bindMatch && onBindConversation) {
              const conversationId = bindMatch[1];
              onBindConversation(conversationId);
            }

            // ── NEW: Parse [PHANTOMA_RESET] signal from ZenCLI stderr ──
            // Triggered when user runs /new. Clears stored conversation ID in parent.
            if (payload.data.includes('[PHANTOMA_RESET]') && onResetConversation) {
              onResetConversation();
            }

            // ── NEW: Parse [PHANTOMA_STATUS] signal from ZenCLI stderr ──
            // Format: \x1b[0m[PHANTOMA_STATUS] active=true/false\n
            // Using a more lenient regex to handle potential whitespace/newline variations
            const statusMatch = payload.data.match(
              /\[PHANTOMA_STATUS\]\s*active\s*=\s*(true|false)/i,
            );
            if (statusMatch) {
              const isActive = statusMatch[1].toLowerCase() === 'true';
              // Fallback to 'zencli' if no agent was detected via input heuristic yet.
              // This handles cases like --resume where the command is injected automatically.
              const agentName = lastKnownAgentIdRef.current || 'zencli';
              const newStatus = isActive ? 'running' : 'idle';

              // Always update provider change, even if we just fell back to default name
              onProviderChangeRef.current?.(agentName, newStatus);
            }

            // ── NEW: Parse [PHANTOMA_EXIT] signal from ZenCLI stderr ──
            // This ensures immediate cleanup even if 'terminal:exit' IPC event is delayed/lost
            if (payload.data.includes('[PHANTOMA_EXIT]')) {
              // Reset detection state locally
              setDetectedAgent(null);

              // Notify parent component to detach agent badge completely
              onProcessExit?.();
            }

            // Note: We no longer call onProviderChange immediately upon detecting the agent name.
            // The badge should only appear when [PHANTOMA_STATUS] active=true is received.
            // This prevents showing 'Running' state just because the CLI was launched.
          }
        };
        const onExit = (_event: any, payload: { terminalId: string; exitCode: number }) => {
          if (payload.terminalId === terminalIdRef.current && term) {
            term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n');
            // Reset detection when process exits
            setDetectedAgent(null);

            // ── NEW: Notify parent that the bound process has terminated ──
            onProcessExit?.();
          } else {
            console.warn(
              `[DEBUG_TERMINAL_EXIT_MISMATCH] ID mismatch! Exiting terminal ${payload.terminalId} vs current ${terminalIdRef.current}`,
            );
          }
        };

        window.api.on('terminal:data', onData);
        window.api.on('terminal:exit', onExit);

        cleanupFunctions.push(() => {
          window.api.off('terminal:data', onData);
          window.api.off('terminal:exit', onExit);
        });
      }

      // --- Strategy 1: Input Heuristic Detection ---
      // Buffer to capture typed commands before Enter is pressed
      let inputBuffer = '';

      const inputDisposable = term.onData((data) => {
        if (window.api?.send) {
          window.api.send('terminal:write', {
            terminalId: terminalIdRef.current,
            data,
          });
        }

        // Accumulate printable characters for command detection
        if (data === '\r' || data === '\n') {
          // User pressed Enter - try to detect agent from the buffered command
          const cmd = inputBuffer.trim();
          if (cmd.length > 0) {
            const detected = detectAgentFromCommandLine(cmd);
            if (detected) {
              setDetectedAgent(detected);
              lastKnownAgentIdRef.current = detected;

              // ── STRATEGY UPDATE: Show badge immediately upon launching CLI ──
              // BUT keep it 'idle' initially. It will switch to 'running' ONLY when
              // [PHANTOMA_STATUS] active=true is received from ZenCLI stderr.
              onProviderChangeRef.current?.(detected, 'idle');
            } else {
              // Non-agent command typed.
              // Optional: Reset lastKnownAgentId if you want strict isolation per terminal session?
              // For now, we keep it so subsequent STATUS signals can still attach if needed,
              // but typically a new agent launch overwrites it anyway.
            }
          }
          inputBuffer = ''; // Reset buffer
        } else if (data === '\x7f' || data === '\b') {
          // Backspace/Delete
          inputBuffer = inputBuffer.slice(0, -1);
        } else if (data >= ' ' && data <= '~') {
          // Printable ASCII
          inputBuffer += data;
        }
      });
      cleanupFunctions.push(() => inputDisposable.dispose());

      // --- Strategy 2: Process Name Detection via IPC (Requires Main Process Support) ---
      // Listen for foreground process updates from the backend
      if (window.api?.on) {
        const onForegroundProcess = (
          _event: any,
          payload: { terminalId: string; processName: string },
        ) => {
          if (payload.terminalId === terminalIdRef.current) {
            const detected = detectAgentFromCommandLine(payload.processName);
            if (detected) {
              setDetectedAgent(detected);
            } else {
              // Optional: If process name is known shell (bash/zsh), reset agent state?
              // Currently keeping last detected agent until exit or override.
            }
          }
        };

        // NOTE: Ensure your Main process emits 'terminal:foreground-process' with { terminalId, processName }
        window.api.on('terminal:foreground-process', onForegroundProcess);
        cleanupFunctions.push(() => {
          window.api.off('terminal:foreground-process', onForegroundProcess);
        });
      }

      // Spawn shell
      const spawnShell = async () => {
        if (!window.api?.invoke || !isMounted || hasSpawnedRef.current) {
          console.log('[DEBUG] CodeTerminal spawnShell skipped', {
            terminalId: terminalIdRef.current,
            hasApi: !!window.api?.invoke,
            isMounted,
            hasSpawned: hasSpawnedRef.current,
          });
          return;
        }

        // Wait for a valid CWD before spawning to prevent landing in Home unexpectedly
        if (!cwd) {
          console.warn('[CodeTerminal] Waiting for valid CWD...');
          return; // Don't spawn yet, will retry when cwd updates via useEffect deps
        }

        let effectiveCwd = cwd;

        // Basic validation
        if (!effectiveCwd.startsWith('/')) {
          console.warn('[CodeTerminal] Relative CWD detected, resolving...', effectiveCwd);
          // If relative, we can't resolve it reliably in renderer without knowing base.
          // Fallback to home is safer than crashing.
          effectiveCwd = '/home/khanhromvn';
        }

        try {
          hasSpawnedRef.current = true;
          if (persistHistory) {
            const saved: string = await window.api
              .invoke('terminal:history-load', panelIdRef.current)
              .catch(() => '');
            if (!isMounted || !term) return;
            term.loadAddon(serializeAddon);
            if (saved) term.write(saved + '\r\n');
          }
          historyReady = true;
          console.log('[DEBUG] CodeTerminal spawning', {
            terminalId: terminalIdRef.current,
            cwd: effectiveCwd,
          });
          const info: any = await window.api.invoke('terminal:spawn', {
            panelId: panelIdRef.current,
            terminalId: terminalIdRef.current,
            cwd: effectiveCwd,
          });
          console.log('[DEBUG] CodeTerminal spawn result', {
            terminalId: terminalIdRef.current,
            info,
          });

          if (info && !info.error) {
            // Initial fit after a short delay to let shell print first prompt
            setTimeout(() => {
              if (isMounted && isOpened) {
                safeFit();

                // ── NEW: Inject initial command nếu có (cho ZenCLI auto-resume) ──
                if (initialCommand && window.api?.send) {
                  // Delay thêm 300ms để shell kịp init prompt và sẵn sàng nhận input
                  setTimeout(() => {
                    if (isMounted && term) {
                      window.api.send('terminal:write', {
                        terminalId: terminalIdRef.current,
                        data: initialCommand + '\n', // Thêm newline để execute
                      });
                    }
                  }, 300);
                }

                // Start observing for future resizes
                if (termRef.current && !resizeObserver) {
                  resizeObserver = new ResizeObserver(() => {
                    if (isMounted && isOpened) requestAnimationFrame(safeFit);
                  });
                  resizeObserver.observe(termRef.current);
                  cleanupFunctions.push(() => resizeObserver?.disconnect());
                }
              }
            }, 100);
          } else {
            throw new Error(info?.error || 'Unknown IPC error');
          }
        } catch (err) {
          console.error('[CodeTerminal] Failed to spawn shell', err);
          hasSpawnedRef.current = false;
          if (term) {
            term.write(`\r\n\x1b[31mError starting terminal: ${(err as Error).message}\x1b[0m\r\n`);
          }
        }
      };

      const spawnTimer = setTimeout(spawnShell, 50);
      cleanupFunctions.push(() => clearTimeout(spawnTimer));
    };

    const openTerminalWhenReady = () => {
      if (!termRef.current || !isMounted || isOpened) return;

      // Check if element has valid dimensions
      if (termRef.current.offsetWidth > 0 && termRef.current.offsetHeight > 0) {
        try {
          term!.open(termRef.current);
          isOpened = true;
          setIsInitialized(true);
          setupIPCAndSpawn();
        } catch (e) {
          console.error('[CodeTerminal] Failed to open terminal:', e);
        }
      } else {
        // Wait for layout to settle using ResizeObserver
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              ro.disconnect();
              openTerminalWhenReady();
              break;
            }
          }
        });
        ro.observe(termRef.current);
        cleanupFunctions.push(() => ro.disconnect());
      }
    };

    createTerminalInstance();
    openTerminalWhenReady();

    return () => {
      console.log('[DEBUG] CodeTerminal cleanup', {
        terminalId: terminalIdRef.current,
        cwd,
      });
      isMounted = false;
      isOpened = false;
      hasSpawnedRef.current = false;

      if (saveTimer) clearTimeout(saveTimer);
      saveHistory();

      cleanupFunctions.forEach((fn) => fn());
      cleanupFunctions = [];

      if (window.api?.invoke) {
        window.api.invoke('terminal:kill', terminalIdRef.current).catch(() => {});
      }

      if (term) {
        term.dispose();
        term = null;
        xtermRef.current = null;
      }
      fitAddon = null;
      fitAddonRef.current = null;
      resizeObserver = null;
    };
  }, [cwd]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // Only show menu if there is a selection or always?
    // Usually terminals show menu on right-click regardless, but user specified "when I highlight text".
    // However, standard UX allows right-click anywhere. Let's allow it everywhere for consistency with Copy/Paste availability check inside handlers if needed.
    // But to strictly follow "khi tôi bôi đen", we can check term.hasSelection().
    // Actually, XTerm usually handles its own right click if not prevented. We are preventing it.
    // Let's open the dropdown at mouse position.

    setContextMenuPos({ top: e.clientY, left: e.clientX });
    setContextMenuOpen(true);
  };

  const handleCopy = () => {
    if (xtermRef.current && xtermRef.current.hasSelection()) {
      navigator.clipboard.writeText(xtermRef.current.getSelection());
    }
    setContextMenuOpen(false);
  };

  const handlePaste = () => {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (window.api?.send && text) {
          window.api.send('terminal:write', {
            terminalId: terminalIdRef.current,
            data: text,
          });
        }
      })
      .catch((err) => console.error('[CodeTerminal] Paste failed:', err));
    setContextMenuOpen(false);
  };

  const handleSelectAll = () => {
    if (xtermRef.current) {
      xtermRef.current.selectAll();
    }
    setContextMenuOpen(false);
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      saveHistoryRef.current?.();
    }
    setContextMenuOpen(false);
  };

  const handleKill = async () => {
    if (window.api?.invoke) {
      await window.api.invoke('terminal:kill', terminalIdRef.current).catch(() => {});
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    }
    setContextMenuOpen(false);
  };

  const handleQuickCommands = () => {
    // Placeholder for quick commands logic
    setContextMenuOpen(false);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={termRef} className="w-full h-full" onContextMenu={handleContextMenu} />

      {contextMenuPos && (
        <Dropdown
          trigger="contextmenu"
          strategy="fixed"
          open={contextMenuOpen}
          onOpenChange={setContextMenuOpen}
          position={contextMenuPos}
        >
          <DropdownTrigger asChild>
            <div /> {/* Invisible trigger since we control open state manually via position */}
          </DropdownTrigger>

          <DropdownContent className="w-48">
            <DropdownItem icon={<Copy className="w-3.5 h-3.5" />} onClick={handleCopy}>
              Copy
            </DropdownItem>
            <DropdownItem icon={<ClipboardPaste className="w-3.5 h-3.5" />} onClick={handlePaste}>
              Paste
            </DropdownItem>
            <DropdownItem
              icon={<SquareMousePointer className="w-3.5 h-3.5" />}
              onClick={handleSelectAll}
            >
              Select All
            </DropdownItem>
            <DropdownItem icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleClear}>
              Clear
            </DropdownItem>
            <DropdownItem
              icon={<PowerOff className="w-3.5 h-3.5 text-red-400" />}
              onClick={handleKill}
              variant="error"
            >
              Kill Terminal
            </DropdownItem>
            <DropdownItem icon={<Zap className="w-3.5 h-3.5" />} onClick={handleQuickCommands}>
              Quick Commands
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}
    </div>
  );
};

export default CodeTerminal;
