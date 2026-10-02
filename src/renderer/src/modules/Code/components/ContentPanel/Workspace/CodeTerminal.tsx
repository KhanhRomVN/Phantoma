import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
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
  cwd?: string;
  onProviderChange?: (providerId: string | null) => void;
}

export const CodeTerminal = ({ cwd, onProviderChange }: CodeTerminalProps) => {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>(
    `code-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number } | null>(null);
  // Track if shell has been spawned to prevent double-spawn on re-render/resize
  const hasSpawnedRef = useRef(false);

  // State for detected AI agent
  const [detectedAgent, setDetectedAgent] = useState<TuiAgentId | null>(null);

  // Ref to hold the latest onProviderChange callback to avoid stale closures and unnecessary effect triggers
  const onProviderChangeRef = useRef(onProviderChange);
  
  console.log('[CodeTerminal] RENDER', {
    terminalId: terminalIdRef.current,
    cwd,
    isInitialized,
    hasSpawned: hasSpawnedRef.current,
  });
  
  // Update ref whenever prop changes (without triggering effects that depend on it)
  useEffect(() => {
    onProviderChangeRef.current = onProviderChange;
  }, [onProviderChange]);

  // Notify parent when provider changes
  // Removed 'onProviderChange' from deps to break infinite loop caused by unstable prop references
  useEffect(() => {
    onProviderChangeRef.current?.(detectedAgent);
  }, [detectedAgent]);

  useEffect(() => {
    let cleanupFunctions: (() => void)[] = [];
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let term: XTerm | null = null;
    let fitAddon: FitAddon | null = null;
    let isOpened = false;

    console.log('[CodeTerminal] EFFECT START', {
      terminalId: terminalIdRef.current,
      cwd,
    });

    const createTerminalInstance = () => {
      console.log('[CodeTerminal] Creating terminal instance', terminalIdRef.current);
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

            // --- AI Agent Detection Logic ---

            // 1. Detect via OSC Titles in the stream
            const titles = extractOscTitles(payload.data);
            if (titles.length > 0) {
              console.log('[DEBUG][AI-Detect] Extracted OSC Titles:', titles);
              for (const title of titles) {
                const agentFromTitle = detectAgentFromTitle(title);
                if (agentFromTitle) {
                  console.log(
                    `[DEBUG][AI-Detect] Detected Agent from Title "${title}": ${agentFromTitle}`,
                  );
                  setDetectedAgent(agentFromTitle);
                  break; // Found one, stop processing this chunk's titles
                } else {
                  console.log(`[DEBUG][AI-Detect] No match for Title: "${title}"`);
                }
              }
            }

            // 2. Detect via Process Name (if available via IPC later, or heuristic from input/output)
            // For now, we rely primarily on OSC titles which are robust for running CLIs.
            // If you have access to foreground process PID/name via main process IPC,
            // you can add another listener here: window.api.on('terminal:foreground-process', ...)
          }
        };
        const onExit = (_event: any, payload: { terminalId: string; exitCode: number }) => {
          if (payload.terminalId === terminalIdRef.current && term) {
            term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n');
            // Reset detection when process exits
            setDetectedAgent(null);
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
            console.log(`[DEBUG][AI-Detect] Command submitted: "${cmd}"`);
            const detected = detectAgentFromCommandLine(cmd);
            if (detected) {
              console.log(`[DEBUG][AI-Detect] Detected Agent from INPUT: ${detected}`);
              setDetectedAgent(detected);
            } else {
              // If it's a shell command that isn't an agent, maybe reset?
              // Or keep previous state if it was just 'ls'?
              // For safety, we don't reset unless explicit exit or new non-agent launch.
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
            console.log(`[DEBUG][AI-Detect] Foreground Process Update: "${payload.processName}"`);
            const detected = detectAgentFromCommandLine(payload.processName);
            if (detected) {
              console.log(`[DEBUG][AI-Detect] Detected Agent from PROCESS NAME: ${detected}`);
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
        if (!window.api?.invoke || !isMounted || hasSpawnedRef.current) return;

        const effectiveCwd = cwd || '/home/khanhromvn';

        try {
          hasSpawnedRef.current = true;
          const info: any = await window.api.invoke('terminal:spawn', {
            terminalId: terminalIdRef.current,
            cwd: effectiveCwd,
          });

          if (info && !info.error) {
            console.log('[CodeTerminal] Shell spawned successfully.', 'cwd:', effectiveCwd);

            // Initial fit after a short delay to let shell print first prompt
            setTimeout(() => {
              if (isMounted && isOpened) {
                safeFit();

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
      console.log('[CodeTerminal] CLEANUP START', {
        terminalId: terminalIdRef.current,
        isMounted,
        isOpened,
      });
      
      isMounted = false;
      isOpened = false;

      cleanupFunctions.forEach((fn) => fn());
      cleanupFunctions = [];

      if (window.api?.invoke) {
        console.log('[CodeTerminal] Killing terminal', terminalIdRef.current);
        window.api.invoke('terminal:kill', terminalIdRef.current).catch(() => {});
      }

      if (term) {
        console.log('[CodeTerminal] Disposing XTerm', terminalIdRef.current);
        term.dispose();
        term = null;
        xtermRef.current = null;
      }
      fitAddon = null;
      fitAddonRef.current = null;
      resizeObserver = null;
      
      console.log('[CodeTerminal] CLEANUP DONE', terminalIdRef.current);
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
    console.log('[CodeTerminal] Quick Commands triggered');
    setContextMenuOpen(false);
  };

  return (
    <div className="relative w-full h-full">
      {/* AI Agent Badge Indicator */}
      {detectedAgent && (
        <div className="absolute top-2 right-2 z-50 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/80 border border-white/20 backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-mono text-white uppercase tracking-wider">
            {detectedAgent}
          </span>
        </div>
      )}

      <div
        ref={termRef}
        className={`w-full h-full transition-all duration-300 ${detectedAgent ? 'ring-1 ring-yellow-500/50' : ''}`}
        style={{ backgroundColor: detectedAgent ? '#1a1b1e' : undefined }}
        onContextMenu={handleContextMenu}
      />

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
