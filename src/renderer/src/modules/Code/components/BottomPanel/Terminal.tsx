import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Copy, ClipboardPaste } from 'lucide-react';
import { Dropdown, DropdownContent, DropdownItem } from '@renderer/components/ui/Dropdown';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const respawnDisposableRef = useRef<any>(null);
  const isUnmountingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCopy = useCallback(() => {
    const term = xtermRef.current;
    if (!term) return;
    const selection = term.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).catch(() => {});
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const handlePaste = useCallback(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        window.api.send('terminal:write', text);
      })
      .catch(() => {});
    closeContextMenu();
  }, [closeContextMenu]);

  const handleResize = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current) return;

    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      try {
        fitAddonRef.current!.fit();
        const { cols, rows } = xtermRef.current!;
        window.api.send('terminal:resize', { cols, rows });
      } catch {
        // ignore
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    isUnmountingRef.current = false;

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
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    containerRef.current.addEventListener('contextmenu', handleContextMenu);

    // ── Spawn shell via node-pty ──
    window.api
      .invoke('terminal:spawn')
      .then((info: { pid: number; shell: string }) => {
        if (isUnmountingRef.current) return;
        term.writeln(
          `\x1b[1;32m●\x1b[0m Shell: \x1b[1;33m${info.shell}\x1b[0m (PID: ${info.pid})\r\n`,
        );
      })
      .catch((err: Error) => {
        if (isUnmountingRef.current) return;
        term.writeln(`\x1b[1;31m✖\x1b[0m Không thể khởi tạo shell: ${err.message}`);
      });

    // Renderer → Main: user input (fire-and-forget, no response needed)
    term.onData((data) => {
      window.api.send('terminal:write', data);
    });

    // Main → Renderer: PTY output
    const onData = (_event: any, data: string) => {
      term.write(data);
    };
    window.api.on('terminal:data', onData);

    // Main → Renderer: PTY exit
    const onExit = (_event: any, { exitCode, signal }: { exitCode: number; signal?: number }) => {
      // Suppress exit message during unmount (e.g. StrictMode double-mount in dev)
      if (isUnmountingRef.current) return;

      const reason = signal ? `signal ${signal}` : `exit code ${exitCode}`;
      term.writeln(
        `\r\n\x1b[1;31m●\x1b[0m Shell đã đóng (${reason}). Gõ phím bất kỳ để khởi tạo lại...`,
      );

      // Re-spawn on any keypress after exit
      if (respawnDisposableRef.current) {
        respawnDisposableRef.current.dispose();
      }
      respawnDisposableRef.current = term.onData(() => {
        if (respawnDisposableRef.current) {
          respawnDisposableRef.current.dispose();
          respawnDisposableRef.current = null;
        }
        window.api
          .invoke('terminal:spawn')
          .then((info: { pid: number; shell: string }) => {
            if (isUnmountingRef.current) return;
            term.writeln(
              `\x1b[1;32m●\x1b[0m Shell: \x1b[1;33m${info.shell}\x1b[0m (PID: ${info.pid})\r\n`,
            );
          })
          .catch(() => {
            if (isUnmountingRef.current) return;
            term.writeln('\x1b[1;31m✖\x1b[0m Không thể khởi tạo lại shell\r\n');
          });
      });
    };
    window.api.on('terminal:exit', onExit);

    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      isUnmountingRef.current = true;
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      window.api.off('terminal:data', onData);
      window.api.off('terminal:exit', onExit);
      if (respawnDisposableRef.current) {
        respawnDisposableRef.current.dispose();
        respawnDisposableRef.current = null;
      }
      window.api.invoke('terminal:kill').catch(() => {});
      term.dispose();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleResize, handleContextMenu]);

  const dropdownPosition = contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined;

  return (
    <>
      <div ref={containerRef} className="flex-1 overflow-hidden" style={{ padding: '4px 8px' }} />
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
    </>
  );
}

export default Terminal;
