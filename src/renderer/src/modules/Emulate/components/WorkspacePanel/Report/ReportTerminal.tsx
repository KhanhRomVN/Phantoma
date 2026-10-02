import React, { useRef, useEffect } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { runtimeApi } from '../../../services/runtime-api.service';

/**
 * ------------------------------------------------------------------
 * ReportTerminal
 * ------------------------------------------------------------------
 * Tab terminal đơn giản cho Report bottom panel.
 * Dùng xterm.js với 1 instance, spawn shell qua IPC 'terminal:spawn'
 * với cwd trỏ tới thư mục code/ của report hiện tại.
 * ------------------------------------------------------------------
 */

interface ReportTerminalProps {
  targetId?: string | null;
  reportId?: string | null;
}

export const ReportTerminal: React.FC<ReportTerminalProps> = ({ targetId, reportId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>(
    `report-terminal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );

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
      runtimeApi.terminalWrite(terminalIdRef.current, data);
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
        const { cols, rows } = term;
        runtimeApi.terminalResize(terminalIdRef.current, cols, rows);
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      runtimeApi.terminalKill(terminalIdRef.current);
      term.dispose();
      xtermRef.current = null;
    };
  }, [targetId, reportId]);

  return (
    <div className="flex-1 relative overflow-hidden" style={{ padding: '4px 8px' }}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ReportTerminal;
