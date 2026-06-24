import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../shared/lib/utils';
import { Send, Terminal as TerminalIcon, X } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command';
}

export function Terminal() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: Date.now(),
      message: 'Terminal initialized. Type commands below.',
      type: 'info',
    },
    {
      id: '2',
      timestamp: Date.now(),
      message: 'Connected to session: default',
      type: 'success',
    },
  ]);
  const [input, setInput] = useState('');
  const [isConnected] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        timestamp: Date.now(),
        message,
        type,
      },
    ]);
  };

  const handleSendCommand = () => {
    if (!input.trim()) return;

    // Add command to logs
    addLog(`> ${input.trim()}`, 'command');

    // Simulate command execution
    const cmd = input.trim().toLowerCase();
    let response = '';

    if (cmd === 'help') {
      response = `Available commands:
  help    - Show this help message
  clear   - Clear terminal
  status  - Show connection status
  ping    - Test connection
  echo <text> - Echo back text
  whoami  - Show current user
  date    - Show current date and time`;
    } else if (cmd === 'clear') {
      setLogs([]);
      setInput('');
      return;
    } else if (cmd === 'status') {
      response = `Connection: ${isConnected ? '🟢 Connected' : '🔴 Disconnected'}
Session: default
Uptime: ${Math.floor((Date.now() - 1700000000000) / 1000)}s`;
    } else if (cmd === 'ping') {
      response = `PONG! ${Date.now() - 1700000000000}ms`;
    } else if (cmd === 'whoami') {
      response = 'user@phantoma';
    } else if (cmd === 'date') {
      response = new Date().toLocaleString('vi-VN');
    } else if (cmd.startsWith('echo ')) {
      response = cmd.substring(5);
    } else if (cmd === '') {
      response = '';
    } else {
      response = `Unknown command: ${cmd}. Type 'help' for available commands.`;
    }

    if (response) {
      addLog(response, 'info');
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'text-text-secondary';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'command':
        return 'text-cyan-400';
      default:
        return 'text-text-secondary';
    }
  };

  const getTypePrefix = (type: LogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'ℹ';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'command':
        return '$';
      default:
        return '•';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-table-headerBg/30 shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-[10px] font-medium text-text-secondary">Terminal</span>
          <span className="flex items-center gap-1">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isConnected ? 'bg-green-400' : 'bg-red-400'
            )} />
            <span className="text-[9px] text-text-secondary/70">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLogs([])}
            className="p-0.5 rounded hover:bg-dropdown-item-hover text-text-secondary hover:text-text-primary transition-colors"
            title="Clear terminal"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-dropdown-item-hover/20 rounded px-1">
            <span className="text-text-secondary/50 shrink-0 text-[10px] select-none">
              {formatTime(log.timestamp)}
            </span>
            <span className={cn('shrink-0 select-none', getTypeColor(log.type))}>
              {getTypePrefix(log.type)}
            </span>
            <span className={cn('break-all', getTypeColor(log.type))}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border shrink-0 p-2 bg-dropdown-item-hover/5">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 select-none text-xs font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-text-primary placeholder:text-text-secondary/50"
            spellCheck={false}
          />
          <button
            onClick={handleSendCommand}
            disabled={!input.trim()}
            className={cn(
              'p-1 rounded transition-colors',
              input.trim()
                ? 'text-primary hover:bg-primary/10'
                : 'text-text-secondary/30 cursor-not-allowed'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}