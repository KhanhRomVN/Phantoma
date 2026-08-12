/**
 * ------------------------------------------------------------------
 * Terminal
 * ------------------------------------------------------------------
 * Bottom panel tab providing an xterm.js-based terminal emulator.
 * Supports multiple terminal instances, shell selection, copy/paste
 * actions, and keyboard shortcut reference. Communicates with the
 * main process for PTY spawn/kill via IPC.
 *
 * Main features:
 * - xterm.js terminal with FitAddon for responsive sizing
 * - Multiple terminal instances (add/close)
 * - Shell selection dropdown (bash, zsh, fish, sh)
 * - Copy (Ctrl+Shift+C) and Paste (Ctrl+Shift+V) actions
 * - Clear terminal action
 * - Keyboard shortcut help tooltip
 * - Auto-focus on mount
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── XTerm ──
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// ── React ──
import { useState, useRef, useEffect, useCallback } from 'react';

// ── UI ──
import { Copy, ClipboardPaste, Terminal as TerminalIcon, Trash2 } from 'lucide-react';

// ── Components ──
import { Dropdown, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TerminalInstance {
  id: string;
  name: string;
  xterm: XTerm | null;
  fitAddon: FitAddon | null;
  pid?: number;
  shell?: string;
  isAlive: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Terminal() {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    terminalId?: string;
  } | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(224); // 14rem = 224px
  const [isResizing, setIsResizing] = useState(false);

  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountingRef = useRef(false);
  const initializedTerminalsRef = useRef<Set<string>>(new Set());
  const hasCreatedInitialTerminalRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  // ── Helper Functions ──────────────────────────────────────────────────────

  const generateTerminalId = useCallback(() => {
    return `terminal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }, []);

  // ── Terminal Management ─────────────────────────────────────────────────

  const createTerminal = useCallback(async () => {
    const id = generateTerminalId();
    setTerminals((prev) => [
      ...prev,
      {
        id,
        name: 'bash', // Default, will be updated after spawn
        xterm: null,
        fitAddon: null,
        isAlive: false,
      },
    ]);

    setActiveTerminalId(id);
  }, [generateTerminalId]);

  const killTerminal = useCallback(
    async (terminalId: string) => {
      const terminal = terminals.find((t) => t.id === terminalId);
      if (!terminal) {
        console.warn('[Terminal] ⚠️  Cannot kill terminal, not found:', terminalId);
        return;
      }

      try {
        await window.api.invoke('terminal:kill', terminalId);
      } catch (err) {
        console.error('[Terminal] ❌ Kill failed:', err);
      }

      // Cleanup
      terminal.xterm?.dispose();
      containerRefs.current.delete(terminalId);
      initializedTerminalsRef.current.delete(terminalId);

      setTerminals((prev) => {
        const filtered = prev.filter((t) => t.id !== terminalId);

        // Switch to another terminal if we killed the active one
        if (terminalId === activeTerminalId && filtered.length > 0) {
          const newActive = filtered[0].id;
          setActiveTerminalId(newActive);
        } else if (filtered.length === 0) {
          setActiveTerminalId(null);
        }

        return filtered;
      });
    },
    [terminals, activeTerminalId],
  );

  // ── Context Menu ──────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: MouseEvent, terminalId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, terminalId });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopy = useCallback(() => {
    const terminalId = contextMenu?.terminalId;
    if (!terminalId) return;

    const terminal = terminals.find((t) => t.id === terminalId);
    if (!terminal || !terminal.xterm) return;

    const selection = terminal.xterm.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).catch(() => {});
    }
    closeContextMenu();
  }, [contextMenu, terminals, closeContextMenu]);

  const handlePaste = useCallback(() => {
    const terminalId = contextMenu?.terminalId;
    if (!terminalId) return;

    navigator.clipboard
      .readText()
      .then((text) => {
        window.api.send('terminal:write', { terminalId, data: text });
      })
      .catch(() => {});
    closeContextMenu();
  }, [contextMenu]);

  // ── Terminal Initialization ─────────────────────────────────────────────

  useEffect(() => {
    terminals.forEach(async (terminalInstance) => {
      // Skip if already initialized
      if (initializedTerminalsRef.current.has(terminalInstance.id)) return;

      const container = containerRefs.current.get(terminalInstance.id);
      if (!container) return;

      initializedTerminalsRef.current.add(terminalInstance.id);

      const term = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        theme: {
          background: '#12141a',
          foreground: '#eef0f4',
          cursor: '#ff9d5c',
          selectionBackground: 'rgba(255, 157, 92, 0.3)',
          black: '#2c313d',
          red: '#ff6b6b',
          green: '#3ecf8e',
          yellow: '#ff9d5c',
          blue: '#5eb3ff',
          magenta: '#c792ea',
          cyan: '#4fc7da',
          white: '#eef0f4',
          brightBlack: '#565d70',
          brightRed: '#ff6b6b',
          brightGreen: '#3ecf8e',
          brightYellow: '#ff9d5c',
          brightBlue: '#5eb3ff',
          brightMagenta: '#c792ea',
          brightCyan: '#4fc7da',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true,
        // Fix IME composition (Vietnamese, Chinese, Japanese input)
        disableStdin: false,
        convertEol: false,
        windowsMode: false,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(container);

      setTimeout(() => {
        fitAddon.fit();
      }, 50);

      // Update terminal instance with xterm
      setTerminals((prev) =>
        prev.map((t) => (t.id === terminalInstance.id ? { ...t, xterm: term, fitAddon } : t)),
      );

      // Context menu
      container.addEventListener('contextmenu', (e) => handleContextMenu(e, terminalInstance.id));

      // PTY output - Register BEFORE spawning shell to catch initial prompt
      const onData = (_event: any, payload: { terminalId: string; data: string }) => {
        if (payload.terminalId === terminalInstance.id) {
          term.write(payload.data);
        }
      };
      window.api.on('terminal:data', onData);

      // PTY exit
      const onExit = (
        _event: any,
        payload: { terminalId: string; exitCode: number; signal?: number },
      ) => {
        if (payload.terminalId !== terminalInstance.id) return;
        if (isUnmountingRef.current) return;

        const reason = payload.signal
          ? `signal ${payload.signal}`
          : `exit code ${payload.exitCode}`;
        term.writeln(`\r\n\x1b[1;31m●\x1b[0m Shell closed (${reason})`);

        setTerminals((prev) =>
          prev.map((t) => (t.id === terminalInstance.id ? { ...t, isAlive: false } : t)),
        );
      };
      window.api.on('terminal:exit', onExit);

      // User input
      term.onData((data) => {
        window.api.send('terminal:write', { terminalId: terminalInstance.id, data });
      });

      // Spawn shell - Do this AFTER registering listeners
      try {
        const info = await window.api.invoke('terminal:spawn', terminalInstance.id);
        if (isUnmountingRef.current) return;

        // Extract shell name (bash, zsh, powershell, etc.)
        const shellName = info.shell.split('/').pop()?.split('.')[0] || 'shell';

        setTerminals((prev) =>
          prev.map((t) =>
            t.id === terminalInstance.id
              ? { ...t, name: shellName, pid: info.pid, shell: info.shell, isAlive: true }
              : t,
          ),
        );
      } catch (err: any) {
        if (isUnmountingRef.current) return;
        console.error('[Terminal] ❌ Failed to spawn shell:', err);
        term.writeln(`\x1b[1;31m✖\x1b[0m Failed to spawn shell: ${err.message}`);
      }
    });
  }, [terminals, handleContextMenu]);

  // ── Resize Handling ──────────────────────────────────────────────────────

  const handleResize = useCallback(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);

    resizeTimerRef.current = setTimeout(() => {
      terminals.forEach((t) => {
        if (t.fitAddon && t.xterm) {
          try {
            t.fitAddon.fit();
            const { cols, rows } = t.xterm;
            window.api.send('terminal:resize', { terminalId: t.id, cols, rows });
          } catch {
            // ignore
          }
        }
      });
    }, 50);
  }, [terminals]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // ── Right Panel Resize ───────────────────────────────────────────────────

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = rightPanelWidth;
    },
    [rightPanelWidth],
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = resizeStartXRef.current - e.clientX;
      const newWidth = Math.max(150, Math.min(500, resizeStartWidthRef.current + deltaX));
      setRightPanelWidth(newWidth);
    },
    [isResizing],
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // ── Create First Terminal ───────────────────────────────────────────────

  useEffect(() => {
    if (terminals.length === 0 && !hasCreatedInitialTerminalRef.current) {
      hasCreatedInitialTerminalRef.current = true;
      createTerminal();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+` to create new terminal
      // Try both ` and the code for backtick
      if (e.ctrlKey && e.shiftKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        createTerminal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [createTerminal]);

  // ── Cleanup on Unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      terminals.forEach((t) => {
        window.api.invoke('terminal:kill', t.id).catch(() => {});
        t.xterm?.dispose();
      });
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────

  const dropdownPosition = contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Terminal Instances */}
        <div className="flex-1 relative overflow-hidden">
          {terminals.map((t) => (
            <div
              key={t.id}
              ref={(el) => {
                if (el) containerRefs.current.set(t.id, el);
              }}
              className={cn(
                'absolute inset-0 overflow-hidden',
                activeTerminalId === t.id ? 'block' : 'hidden',
              )}
              style={{ padding: '4px 8px' }}
            />
          ))}
        </div>
      </div>

      {/* Right Panel - Terminal List (only show when multiple terminals) */}
      {terminals.length > 1 && (
        <div
          className="border-l border-border bg-sidebar flex flex-col relative"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 transition-colors',
              isResizing && 'bg-accent',
            )}
            onMouseDown={handleResizeStart}
          />

          <div className="flex-1 overflow-y-auto">
            {terminals.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTerminalId(t.id)}
                className={cn(
                  'group w-full flex items-center gap-2 px-3 py-1 text-left transition-colors',
                  'hover:bg-sidebar-item-hover',
                  activeTerminalId === t.id && 'bg-sidebar-item-hover',
                )}
              >
                <TerminalIcon
                  className={cn('w-3.5 h-3.5 shrink-0', t.isAlive ? 'text-success' : 'text-error')}
                />

                <div className="flex-1 min-w-0 text-xs font-medium text-text-primary truncate">
                  {t.name}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    killTerminal(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-error/10 text-text-secondary hover:text-error transition-all"
                  title="Kill Terminal"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && dropdownPosition && (
        <Dropdown
          open={true}
          onOpenChange={(open) => {
            if (!open) closeContextMenu();
          }}
          position={dropdownPosition}
          strategy="fixed"
          side="bottom"
          align="start"
          sideOffset={0}
          disableAutoFlip={false}
        >
          <DropdownContent className="min-w-[140px] py-1">
            <DropdownItem onClick={handleCopy} className="flex items-center gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" />
              Copy
            </DropdownItem>
            <DropdownItem onClick={handlePaste} className="flex items-center gap-2 text-xs">
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}
    </div>
  );
}

export default Terminal;
