import React, { useRef, useEffect } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

/**
 * ------------------------------------------------------------------
 * ReportTerminal
 * ------------------------------------------------------------------
 * Tab terminal đơn giản cho Report bottom panel.
 * Dùng xterm.js với 1 instance, spawn shell qua IPC 'terminal:spawn'.
 * ------------------------------------------------------------------
 */

export const ReportTerminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>(`report-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: 'transparent',
        foreground: '#eef0f4',
        cursor: '#ff9d5c',
      },
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    setTimeout(() => fitAddon.fit(), 50);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // PTY output
    const onData = (_event: any, payload: { terminalId: string; data: string }) => {
      if (payload.terminalId === terminalIdRef.current) {
        term.write(payload.data);
      }
    };
    window.api.on('terminal:data', onData);

    // PTY exit
    const onExit = (_event: any, payload: { terminalId: string; exitCode: number }) => {
      if (payload.terminalId !== terminalIdRef.current) return;
      term.writeln(`\r\n\x1b[1;31m●\x1b[0m Shell closed (exit code ${payload.exitCode})`);
    };
    window.api.on('terminal:exit', onExit);

    // User input
    term.onData((data) => {
      window.api.send('terminal:write', { terminalId: terminalIdRef.current, data });
    });

    // Spawn shell
    window.api.invoke('terminal:spawn', terminalIdRef.current)
      .then((info: any) => {
        console.log('[ReportTerminal] Shell spawned:', info.shell);
      })
      .catch((err: any) => {
        term.writeln(`\x1b[1;31m✖\x1b[0m Failed to spawn shell: ${err?.message || err}`);
      });

    const handleResize = () => {
      try {
        fitAddon.fit();
        const { cols, rows } = term;
        window.api.send('terminal:resize', { terminalId: terminalIdRef.current, cols, rows });
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.api.invoke('terminal:kill', terminalIdRef.current).catch(() => {});
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  return (
    <div className="flex-1 relative overflow-hidden" style={{ padding: '4px 8px' }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ReportTerminal;