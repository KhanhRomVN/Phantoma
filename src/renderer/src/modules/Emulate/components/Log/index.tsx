import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  Trash2,
  Copy,
  Pause,
  Play,
  Download,
  Filter,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  Regex,
} from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { cn } from '../../../../shared/lib/utils';

interface LogEntry {
  timestamp: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E' | 'F';
  tag: string;
  pid: string;
  message: string;
  raw: string;
}

interface LogViewerProps {
  emulatorSerial?: string;
  onClose?: () => void;
}

const MAX_LOGS = 10000;

export function LogViewer({ emulatorSerial, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<Record<string, boolean>>({
    V: true,
    D: true,
    I: true,
    W: true,
    E: true,
    F: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  const packageDropdownRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<VirtuosoHandle>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logBufferRef = useRef<LogEntry[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFlushTime = useRef<number>(Date.now());
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  useEffect(() => {
    if (!emulatorSerial) return;

    let removeListener: (() => void) | null = null;

    const startLogcat = async () => {
      try {
        await window.api.invoke('mobile:start-logcat', emulatorSerial);
        setIsRunning(true);
        removeListener = window.api.on('mobile:logcat-output', (_, data: string) => {
          if (isPaused) return;
          const entry = parseLogLine(data);
          if (entry) logBufferRef.current.push(entry);
        });
        const flushLogs = () => {
          const now = Date.now();
          const timeSinceLastFlush = now - lastFlushTime.current;
          const shouldFlush = logBufferRef.current.length >= 50 || timeSinceLastFlush >= 250;
          if (shouldFlush && logBufferRef.current.length > 0) {
            setLogs((prev) => {
              const newLogs = [...prev, ...logBufferRef.current];
              logBufferRef.current = [];
              lastFlushTime.current = now;
              if (newLogs.length > MAX_LOGS) return newLogs.slice(newLogs.length - MAX_LOGS);
              return newLogs;
            });
          }
          rafRef.current = requestAnimationFrame(flushLogs);
        };
        rafRef.current = requestAnimationFrame(flushLogs);
      } catch (e) {
        console.error('[LogViewer] Failed to start logcat:', e);
      }
    };
    startLogcat();

    return () => {
      if (removeListener) window.api.off('mobile:logcat-output', removeListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.api.invoke('mobile:stop-logcat', emulatorSerial).catch(console.error);
      setIsRunning(false);
    };
  }, [emulatorSerial, isPaused]);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!emulatorSerial) return;
      try {
        const packages = await window.api.invoke('mobile:list-packages', emulatorSerial);
        setInstalledPackages(packages.sort());
      } catch (e) {
        console.error(e);
      }
    };
    fetchPackages();
  }, [emulatorSerial]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(event.target as Node))
        setShowPackageDropdown(false);
    };
    if (showPackageDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPackageDropdown]);

  const parseLogLine = (line: string): LogEntry | null => {
    const match = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s+(.*)$/,
    );
    if (match)
      return {
        timestamp: match[1],
        pid: match[2],
        level: match[4] as LogEntry['level'],
        tag: match[5],
        message: match[6],
        raw: line,
      };
    const simpleMatch = line.match(/^([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/);
    if (simpleMatch)
      return {
        timestamp: new Date().toLocaleTimeString(),
        pid: simpleMatch[3],
        level: simpleMatch[1] as LogEntry['level'],
        tag: simpleMatch[2],
        message: simpleMatch[4],
        raw: line,
      };
    const timeMatch = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/,
    );
    if (timeMatch)
      return {
        timestamp: timeMatch[1],
        pid: timeMatch[4],
        level: timeMatch[2] as LogEntry['level'],
        tag: timeMatch[3],
        message: timeMatch[5],
        raw: line,
      };
    return {
      timestamp: new Date().toLocaleTimeString(),
      pid: '?',
      level: 'I',
      tag: 'RAW',
      message: line,
      raw: line,
    };
  };

  const handleClear = () => setLogs([]);
  const handleCopy = () => {
    const text = filteredLogs.map((log) => log.raw).join('\n');
    navigator.clipboard.writeText(text);
  };
  const handleDownload = () => {
    const text = filteredLogs.map((log) => log.raw).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((log) => counts.set(log.tag, (counts.get(log.tag) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const toggleTagVisibility = useCallback(
    (tag: string) =>
      setHiddenTags((prev) => {
        const next = new Set(prev);
        if (next.has(tag)) next.delete(tag);
        else next.add(tag);
        return next;
      }),
    [],
  );

  const searchRegex = useMemo(() => {
    if (!searchTerm) return null;
    try {
      let pattern = searchTerm;
      const flags = matchCase ? 'g' : 'gi';
      if (!useRegex) pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (matchWholeWord) pattern = `\\b${pattern}\\b`;
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }, [searchTerm, matchCase, matchWholeWord, useRegex]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (!levelFilter[log.level]) return false;
        if (hiddenTags.has(log.tag)) return false;
        if (
          selectedPackages.size > 0 &&
          !Array.from(selectedPackages).some((pkg) =>
            log.tag.toLowerCase().includes(pkg.toLowerCase()),
          )
        )
          return false;
        if (searchRegex) {
          searchRegex.lastIndex = 0;
          return (
            searchRegex.test(log.tag) || searchRegex.test(log.message) || searchRegex.test(log.pid)
          );
        }
        return true;
      }),
    [logs, levelFilter, hiddenTags, selectedPackages, searchRegex],
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'E':
      case 'F':
        return 'text-red-400';
      case 'W':
        return 'text-amber-400';
      case 'I':
        return 'text-cyan-400';
      case 'D':
        return 'text-slate-400';
      case 'V':
        return 'text-zinc-500';
      default:
        return 'text-foreground';
    }
  };
  const getLevelBgColor = (level: string) => {
    switch (level) {
      case 'E':
      case 'F':
        return 'bg-red-500/5';
      case 'W':
        return 'bg-amber-500/5';
      case 'I':
        return 'bg-cyan-500/5';
      case 'D':
        return 'bg-slate-500/5';
      case 'V':
        return 'bg-zinc-500/5';
      default:
        return 'bg-muted/10';
    }
  };
  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
  };

  if (!emulatorSerial) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-green-500/15 border border-green-500/25">
            <Search className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Log Viewer</h2>
            <p className="text-xs text-text-secondary mt-0.5">Android logcat output</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-text-primary font-medium">No Emulator Selected</p>
            <p className="text-xs text-text-secondary mt-1">Launch an Android app to view logs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-table-bodyBg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg border border-accent-green/25 bg-accent-green/15">
          <Search className="w-4 h-4 text-accent-green" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-text-primary">Log Viewer</h2>
          <p className="text-xs text-text-secondary mt-0.5">Android logcat output</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Toolbar - horizontal */}
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 bg-muted/40 shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-16 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setMatchCase(!matchCase)}
              className={cn(
                'p-0.5 rounded cursor-pointer border-none transition-all',
                matchCase
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
              )}
            >
              <CaseSensitive className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMatchWholeWord(!matchWholeWord)}
              className={cn(
                'p-0.5 rounded cursor-pointer border-none transition-all',
                matchWholeWord
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
              )}
            >
              <WholeWord className="w-3 h-3" />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={cn(
                'p-0.5 rounded cursor-pointer border-none transition-all',
                useRegex
                  ? 'bg-success/20 text-success'
                  : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover',
              )}
            >
              <Regex className="w-3 h-3" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-1.5 rounded',
            showFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
          )}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-6 bg-border" />
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground"
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            'px-2 py-1 text-xs rounded border',
            autoScroll
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'text-muted-foreground border-border',
          )}
        >
          Auto
        </button>
        <button onClick={handleClear} className="p-1.5 hover:bg-muted rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleCopy} className="p-1.5 hover:bg-muted rounded">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDownload} className="p-1.5 hover:bg-muted rounded">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="border-b border-border bg-muted/20 p-2 space-y-2 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Level:</span>
              {(['V', 'D', 'I', 'W', 'E'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter((prev) => ({ ...prev, [level]: !prev[level] }))}
                  className={cn(
                    'px-2 py-1 text-xs font-mono rounded border',
                    levelFilter[level]
                      ? `${getLevelColor(level)} border-current bg-current/10`
                      : 'text-muted-foreground border-border bg-background',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 flex-1 max-w-xs" ref={packageDropdownRef}>
              <span className="text-xs text-muted-foreground">Package:</span>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowPackageDropdown(!showPackageDropdown)}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded h-6 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedPackages.size === 0
                      ? 'Select packages...'
                      : `${selectedPackages.size} selected`}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showPackageDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-[200px] overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-border space-y-1">
                      <input
                        type="text"
                        placeholder="Search packages..."
                        value={packageSearchTerm}
                        onChange={(e) => setPackageSearchTerm(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-muted border border-border rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPackages(new Set(installedPackages))}
                          className="flex-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedPackages(new Set())}
                          className="flex-1 px-2 py-0.5 text-[10px] bg-muted rounded"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[150px]">
                      {installedPackages
                        .filter(
                          (pkg) =>
                            !packageSearchTerm ||
                            pkg.toLowerCase().includes(packageSearchTerm.toLowerCase()),
                        )
                        .map((pkg) => (
                          <label
                            key={pkg}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              className="w-3 h-3"
                              checked={selectedPackages.has(pkg)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedPackages);
                                if (e.target.checked) newSelected.add(pkg);
                                else newSelected.delete(pkg);
                                setSelectedPackages(newSelected);
                              }}
                            />
                            <span className="truncate">{pkg}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="h-px bg-border/50" />
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Detected Tags ({tagCounts.length})</span>
              <div className="flex gap-2">
                <button onClick={() => setHiddenTags(new Set())}>Show All</button>
                <button onClick={() => setHiddenTags(new Set(tagCounts.map(([tag]) => tag)))}>
                  Hide All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
              {tagCounts.map(([tag, count]) => (
                <label
                  key={tag}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-xs border cursor-pointer',
                    hiddenTags.has(tag)
                      ? 'bg-muted/30 text-muted-foreground border-transparent opacity-60'
                      : 'bg-background border-border hover:border-primary/50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="w-3 h-3"
                    checked={!hiddenTags.has(tag)}
                    onChange={() => toggleTagVisibility(tag)}
                  />
                  <span style={{ color: !hiddenTags.has(tag) ? getTagColor(tag) : undefined }}>
                    {tag}
                  </span>
                  <span className="text-[10px] bg-muted px-1 rounded-full">{count}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs - Virtualized horizontal */}
      <div className="flex-1 bg-table-bodyBg relative">
        {filteredLogs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            {isRunning ? 'Waiting for logs...' : 'No logs available'}
          </div>
        )}
        <Virtuoso
          ref={logContainerRef}
          data={filteredLogs}
          followOutput={autoScroll}
          defaultItemHeight={60}
          className="font-mono text-xs h-full"
          itemContent={(_index, log) => (
            <div
              className={cn(
                'py-2 px-3 mx-3 my-0.5 rounded-md flex flex-col gap-1 group transition-all hover:bg-muted/5',
                getLevelBgColor(log.level),
              )}
            >
              <div className="flex items-center gap-2 text-[10px] leading-none opacity-80">
                <span
                  className={cn(
                    'font-bold px-1.5 py-0.5 rounded text-[9px]',
                    getLevelColor(log.level),
                    'bg-current/10',
                  )}
                >
                  {log.level}
                </span>
                <span className="font-mono text-muted-foreground">{log.timestamp}</span>
                <span className="text-muted-foreground/30">•</span>
                <span
                  className="font-semibold truncate max-w-[120px]"
                  style={{ color: getTagColor(log.tag) }}
                >
                  {log.tag}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <span className="font-mono text-muted-foreground/50">{log.pid}</span>
              </div>
              <div className="text-foreground/90 break-all text-xs leading-5 pl-1">
                {log.message}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export default LogViewer;
