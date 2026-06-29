import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useProject } from "../../../../context/ProjectContext";

interface TerminalBlockProps {
  logs: string;
  status?: "busy" | "idle" | "free";
  maxHeight?: number;
  rows?: number;
  initialCommand?: string;
  cwd?: string;
  onInput?: (data: string) => void;
  rejectedOutline?: boolean;
}

const CopyIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Copy button:
 *  - hidden (opacity 0) by default, shown (opacity 1) via parent CSS class
 *  - no background in resting state, subtle bg on hover
 *  - shows checkmark for 1.5 s after copy
 */
const CopyButton: React.FC<{ getText: () => string; title?: string }> = ({
  getText,
  title,
}) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = getText();
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title || "Copy"}
      className="terminal-copy-btn flex items-center justify-center w-[22px] h-[22px] p-0 border-none rounded-[4px] cursor-pointer shrink-0 transition-[background,color,opacity] duration-[0.15s]"
      style={{
        background: copied
          ? "color-mix(in srgb, var(--vscode-gitDecoration-addedResourceForeground) 15%, transparent)"
          : hovered
            ? "color-mix(in srgb, var(--vscode-foreground) 22%, transparent)"
            : "transparent",
        color: copied
          ? "var(--vscode-gitDecoration-addedResourceForeground)"
          : "var(--vscode-terminal-foreground)",
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
};

const TerminalInputBar: React.FC<{ onInput: (data: string) => void }> = ({
  onInput,
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onInput(value + "\n");
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    const lineHeight = 18;
    ta.style.height = Math.min(ta.scrollHeight, lineHeight * 3) + "px";
  };

  return (
    <div className="flex items-end px-2.5 py-1 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-input-background,var(--vscode-terminal-background))]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="type and press Enter…"
        rows={1}
        className="flex-1 bg-transparent border-none outline-none resize-none overflow-hidden text-[var(--vscode-terminal-foreground)] font-mono text-xs leading-[18px] p-0 min-h-[18px] max-h-[54px]"
      />
    </div>
  );
};

/** Helper: Read a CSS custom property value from the document root.
 *  Returns the resolved value or fallback if unavailable.
 *  This is needed because xterm.js requires actual color values,
 *  not CSS var() strings which it cannot parse. */
const getCSSVar = (name: string, fallback: string): string => {
  if (typeof document === "undefined" || !document.documentElement)
    return fallback;
  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
};

/** Build xterm.js theme object by reading VS Code CSS variables from the DOM.
 *  This ensures xterm receives actual resolved color values,
 *  so terminal output colors match the current VS Code theme. */
const buildXtermTheme = () => ({
  background: "transparent",
  foreground: getCSSVar("--vscode-terminal-foreground", "#cccccc"),
  cursor: getCSSVar("--vscode-terminal-foreground", "#cccccc"),
  black: getCSSVar("--vscode-terminal-ansiBlack", "#000000"),
  red: getCSSVar("--vscode-terminal-ansiRed", "#cd3131"),
  green: getCSSVar("--vscode-terminal-ansiGreen", "#0dbc79"),
  yellow: getCSSVar("--vscode-terminal-ansiYellow", "#e5e510"),
  blue: getCSSVar("--vscode-terminal-ansiBlue", "#2472c8"),
  magenta: getCSSVar("--vscode-terminal-ansiMagenta", "#bc3fbc"),
  cyan: getCSSVar("--vscode-terminal-ansiCyan", "#11a8cd"),
  white: getCSSVar("--vscode-terminal-ansiWhite", "#e5e5e5"),
  brightBlack: getCSSVar("--vscode-terminal-ansiBrightBlack", "#666666"),
  brightRed: getCSSVar("--vscode-terminal-ansiBrightRed", "#f14c4c"),
  brightGreen: getCSSVar("--vscode-terminal-ansiBrightGreen", "#23d18b"),
  brightYellow: getCSSVar("--vscode-terminal-ansiBrightYellow", "#f5f543"),
  brightBlue: getCSSVar("--vscode-terminal-ansiBrightBlue", "#3b8eea"),
  brightMagenta: getCSSVar("--vscode-terminal-ansiBrightMagenta", "#d670d6"),
  brightCyan: getCSSVar("--vscode-terminal-ansiBrightCyan", "#29b8db"),
  brightWhite: getCSSVar("--vscode-terminal-ansiBrightWhite", "#e5e5e5"),
});

export const TerminalBlock: React.FC<TerminalBlockProps> = ({
  logs,
  status,
  maxHeight = 400,
  initialCommand,
  cwd,
  rows = 22,
  onInput,
  rejectedOutline,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { homedir } = useProject();

  const formatCommand = (cmd: string) => {
    if (!cmd) return "";
    const lines = cmd.split("\n");
    if (lines.length > 3) {
      return lines.slice(0, 3).join("\n") + "\n...";
    }
    return cmd;
  };

  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isXtermVisible, setIsXtermVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [physicalLineCount, setPhysicalLineCount] = useState(0);
  const canExpand = physicalLineCount > 15;

  const toggleExpand = () => {
    if (canExpand) setIsExpanded((v) => !v);
  };

  const stripAnsi = (str: string) =>
    str
      .replace(/\x1B\[[0-9;?]*[A-Za-z~]/g, "")
      .replace(/\x1b\].*?(\x07|\x1b\\)/g, "");

  useEffect(() => {
    if (logs || status === "busy") {
      setIsXtermVisible(true);
    } else {
      setIsXtermVisible(false);
    }
  }, [logs, status]);

  useEffect(() => {
    if (!isXtermVisible || !terminalRef.current) return;

    if (!xtermRef.current) {
      const term = new Terminal({
        cursorBlink: false,
        cursorStyle: "underline",
        cursorInactiveStyle: "none",
        disableStdin: true,
        fontSize: 12,
        fontFamily:
          'var(--vscode-editor-font-family, "Courier New", Courier, monospace)',
        theme: buildXtermTheme(),
        allowProposedApi: true,
        rows: rows,
        cols: 80,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.attachCustomKeyEventHandler(() => false);

      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        term.dispose();
        window.removeEventListener("resize", handleResize);
        xtermRef.current = null;
        lastWrittenLogsRef.current = "";
      };
    }
  }, [isXtermVisible]);

  const lastWrittenLogsRef = useRef("");

  useEffect(() => {
    if (xtermRef.current && isXtermVisible) {
      const trimmedLogs = logs.replace(/\r?\n$/, "");

      if (!trimmedLogs.startsWith(lastWrittenLogsRef.current)) {
        xtermRef.current.reset();
        xtermRef.current.write(trimmedLogs);
        lastWrittenLogsRef.current = trimmedLogs;
      } else if (trimmedLogs.length > lastWrittenLogsRef.current.length) {
        const newData = trimmedLogs.substring(
          lastWrittenLogsRef.current.length,
        );
        xtermRef.current.write(newData);
        lastWrittenLogsRef.current = trimmedLogs;
      }

      const logicalLines = logs.split(/\n/);
      const terminalCols = xtermRef.current.cols || 80;
      let count = 0;
      logicalLines.forEach((line) => {
        const cleanLine = stripAnsi(line);
        count += Math.max(1, Math.ceil(cleanLine.length / terminalCols));
      });

      if (physicalLineCount !== count) setPhysicalLineCount(count);

      const effectiveMaxRows = isExpanded ? rows : 15;
      const targetRows = Math.max(1, Math.min(effectiveMaxRows, count));

      if (xtermRef.current.rows !== targetRows) {
        xtermRef.current.resize(terminalCols, targetRows);
        if (fitAddonRef.current) fitAddonRef.current.fit();
      }

      xtermRef.current.options.cursorBlink = status === "busy";
      xtermRef.current.options.theme = {
        ...xtermRef.current.options.theme,
        cursor:
          status === "busy"
            ? getCSSVar("--vscode-terminal-foreground", "#cccccc")
            : "transparent",
      };
    }
  }, [logs, status, isXtermVisible, rows]);

  const getCleanLogs = () => stripAnsi(logs || "");
  const getCommand = () => initialCommand || "";

  return (
    <>
      <div
        className="terminal-block-container flex flex-col bg-[var(--vscode-terminal-background)] rounded-md overflow-hidden font-mono border border-[var(--vscode-panel-border)]"
        style={
          rejectedOutline
            ? {
                outline:
                  "1px solid color-mix(in srgb, var(--vscode-errorForeground, #f44336) 60%, transparent)",
                borderRadius: "6px",
              }
            : undefined
        }
      >
        {/* ── COMMAND HEADER ── Copy button hidden by default, shown on hover via CSS */}
        {isXtermVisible && (
          <div
            className="terminal-fixed-header terminal-cmd-area flex items-center gap-2 px-2.5 py-1.5 bg-[var(--vscode-editor-background)] border-b border-[var(--vscode-panel-border)] z-[5] sticky top-0 select-none transition-colors duration-200"
            onClick={toggleExpand}
            style={{ cursor: canExpand ? "pointer" : "default" }}
            onMouseEnter={(e) => {
              if (canExpand)
                e.currentTarget.style.backgroundColor =
                  "var(--vscode-list-hoverBackground, var(--vscode-editor-background))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--vscode-editor-background, #1e1e1e)";
            }}
          >
            {/* Command text — same style as output */}
            <div className="font-mono text-xs text-[var(--vscode-terminal-foreground,#cccccc)] leading-[1.5] whitespace-pre-wrap break-all flex-1 min-w-0">
              {initialCommand ? formatCommand(initialCommand) : "Terminal"}
            </div>

            {/* Right actions: copy + chevron */}
            <div
              className="flex items-center gap-1 ml-auto shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* CSS class on parent (.terminal-cmd-area) controls opacity */}
              <CopyButton getText={getCommand} title="Copy command" />
              {canExpand && (
                <div
                  className={`codicon codicon-chevron-${isExpanded ? "up" : "down"} text-xs opacity-70 cursor-pointer text-[var(--vscode-terminal-foreground,#cccccc)]`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── OUTPUT AREA ── Copy button hidden by default, shown on hover via CSS */}
        <div className="terminal-output-area relative">
          {isXtermVisible && logs && (
            <div className="terminal-output-copy-btn absolute top-1.5 right-2 z-10">
              <CopyButton getText={getCleanLogs} title="Copy output" />
            </div>
          )}

          <div
            className="terminal-content-wrapper px-3 py-2 bg-[var(--vscode-terminal-background)] overflow-y-auto"
            style={{
              maxHeight: `${maxHeight}px`,
              pointerEvents: "auto",
              userSelect: "none",
            }}
          >
            {!isXtermVisible ? (
              <div className="terminal-richtext-fallback flex flex-wrap gap-2 items-center py-2 px-1 text-[13px] leading-[1.5] text-[var(--vscode-terminal-foreground)] font-mono whitespace-pre-wrap break-all">
                <div className="font-mono text-xs text-[var(--vscode-terminal-foreground,#cccccc)] leading-[1.5] whitespace-pre-wrap break-all">
                  {initialCommand
                    ? formatCommand(initialCommand)
                    : "No command executed yet."}
                </div>
              </div>
            ) : (
              <div
                ref={terminalRef}
                className="xterm-container w-full h-full"
                onPaste={(e) => e.preventDefault()}
              />
            )}
          </div>
        </div>

        {onInput && <TerminalInputBar onInput={onInput} />}
      </div>

      <style>{`
        .terminal-block-container {
          font-family: var(--vscode-editor-font-family, "Courier New", Courier, monospace);
        }

        .terminal-block-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 12px 0px 29px;
          background-color: transparent;
          border-bottom: none;
          user-select: none;
          cursor: pointer;
          position: relative;
        }

        .terminal-block .terminal-block-header {
          background-color: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-sideBarSection-header-background, rgba(0, 0, 0, 0.1)));
          border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.12));
        }

        .terminal-block.git-tool .terminal-block-header {
          border-bottom: none;
          background-color: transparent;
        }

        .terminal-block.commit-message-tool .terminal-block-header {
          border-bottom: none;
          background-color: transparent;
        }

        .terminal-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .terminal-header-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .terminal-status-dot {
          flex-shrink: 0;
        }

        .terminal-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--vscode-terminal-foreground);
          font-family: var(--vscode-editor-font-family, monospace);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .terminal-sub-info {
          font-size: 11px;
          opacity: 0.5;
          font-family: var(--vscode-font-family);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-left: 29px;
          position: relative;
          display: flex;
          align-items: center;
          height: 18px;
          margin-top: -2px;
        }

        .terminal-sub-info.error-sub-info {
          font-size: var(--vscode-font-size, 13px);
          opacity: 1;
          color: var(--vscode-foreground);
          height: auto;
          white-space: normal;
          overflow: visible;
          text-overflow: unset;
          line-height: 1.5;
          padding-top: 2px;
          padding-bottom: 4px;
        }

        .terminal-sub-info::before {
          content: "";
          position: absolute;
          left: 15px;
          top: -8px;
          width: 10px;
          height: 16px;
          border-left: 2px solid var(--vscode-panel-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.3)));
          border-bottom: 2px solid var(--vscode-panel-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.3)));
          border-bottom-left-radius: 4px;
          transform: translateX(-1px);
        }

        .terminal-state-badge {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 10px;
          background-color: var(--vscode-badge-background, #4d4d4d);
          color: var(--vscode-badge-foreground, #ffffff);
          opacity: 0.8;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .execute-button-minimal:hover {
          color: var(--vscode-button-hoverBackground) !important;
          background-color: color-mix(in srgb, var(--vscode-foreground) 10%, transparent) !important;
        }

        /* ── Copy button visibility ──────────────────────────────────────────────── */
        .terminal-cmd-area .terminal-copy-btn,
        .terminal-output-copy-btn {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
        }

        .terminal-cmd-area:hover .terminal-copy-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .terminal-output-area:hover .terminal-output-copy-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .terminal-copy-btn:hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        .terminal-content-wrapper {
          scrollbar-width: thin;
          scrollbar-color: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4)) transparent;
        }

        .terminal-content-wrapper:hover {
          scrollbar-color: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7)) transparent;
        }

        .xterm .xterm-viewport {
          background-color: transparent !important;
        }

        .xterm .xterm-screen {
          padding: 4px;
        }

        .terminal-content-wrapper::-webkit-scrollbar {
          width: 6px;
        }

        .terminal-content-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }

        .terminal-content-wrapper::-webkit-scrollbar-thumb {
          background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4));
          border-radius: 3px;
        }

        .terminal-content-wrapper::-webkit-scrollbar-thumb:hover {
          background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
        }

        /* Timeline Styles */
        :root {
          --timeline-axis: 15px;
          --timeline-dot-size: 8px;
        }

        .chat-timeline-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .chat-timeline-wrapper::before {
          display: none;
        }

        .assistant-message-container {
          position: relative;
        }

        .timeline-item {
          position: relative;
          margin-left: 0;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .assistant-message-container .timeline-item:not(.last)::before {
          content: "";
          position: absolute;
          left: 15px;
          transform: translateX(-50%);
          top: 14px;
          bottom: -24px;
          width: 2px;
          background-color: var(--vscode-textBlockQuote-border, var(--vscode-editorLineNumber-foreground));
          opacity: 0.5;
          pointer-events: none;
        }

        .timeline-item.last::before {
          display: none;
        }

        .timeline-dot {
          position: absolute;
          left: 15px;
          transform: translateX(-50%);
          top: 22px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          z-index: 10;
          background-color: var(--vscode-descriptionForeground);
          box-shadow: 0 0 0 2px var(--vscode-editor-background), 0 0 0 3px var(--vscode-textBlockQuote-border, var(--vscode-editorLineNumber-foreground));
          transition: all 0.2s ease;
          animation: timeline-dot-fade-in 0.25s ease-out both;
        }

        @keyframes timeline-dot-fade-in {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }

        .timeline-mask {
          position: relative;
        }

        .timeline-mask::after {
          content: "";
          position: absolute;
          left: 15px;
          transform: translateX(-50%);
          top: -24px;
          bottom: 0;
          width: 4px;
          background-color: var(--secondary-bg);
          z-index: 1;
          pointer-events: none;
        }

        .timeline-content {
          padding-left: 29px;
        }

        .user-message-container {
          position: relative;
        }

        .user-message-undo-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          opacity: 0;
          pointer-events: none;
          background: color-mix(in srgb, var(--input-bg) 60%, var(--vscode-editor-background));
          border: 1px solid color-mix(in srgb, var(--input-bg) 40%, var(--vscode-editor-background));
          border-radius: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: color-mix(in srgb, var(--primary-text) 90%, var(--vscode-editor-foreground));
          cursor: pointer;
          transition: opacity 0.15s ease;
          z-index: 10;
        }

        .user-message-container:hover .user-message-undo-btn {
          opacity: 1;
          pointer-events: auto;
        }

        .user-message-undo-btn:hover {
          background: color-mix(in srgb, var(--input-bg) 40%, var(--vscode-editor-background));
          color: var(--vscode-terminal-foreground);
        }

        .user-message-undo-btn svg {
          width: 14px;
          height: 14px;
          stroke-width: 2px;
        }
      `}</style>
    </>
  );
};