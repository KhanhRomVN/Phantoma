/**
 * ------------------------------------------------------------------
 * WebSocketUI
 * ------------------------------------------------------------------
 * Giao diện theo dõi WebSocket: danh sách connections bên trái, chi
 * tiết frames (send/receive) bên phải. Filter theo direction, opcode
 * và search payload. Dữ liệu đọc từ useWebSocketStore.
 *
 * Backend sẽ đẩy dữ liệu vào store thông qua addConnection/addFrame.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useMemo, useState } from 'react';

// ── UI ──
import { ArrowDownLeft, ArrowUpRight, Circle, Copy, Filter, Search, Trash2 } from 'lucide-react';

// ── Stores ──
import { useWebSocketStore } from '../../../stores/websocketStore';

// ── Types ──
import type { WebSocketConnection, WebSocketFrame } from '../../../types/inspector';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Constants ──────────────────────────────────────────────────────────
const OPCODE_CONFIG: Record<WebSocketFrame['opcode'], { label: string; colorClass: string }> = {
  text: { label: 'TEXT', colorClass: 'text-emerald-400' },
  binary: { label: 'BIN', colorClass: 'text-amber-400' },
  ping: { label: 'PING', colorClass: 'text-sky-400' },
  pong: { label: 'PONG', colorClass: 'text-indigo-400' },
  close: { label: 'CLOSE', colorClass: 'text-rose-400' },
};

// ─── Helpers ────────────────────────────────────────────────────────────
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryPrettyPayload(payload: string): string {
  const trimmed = payload.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return payload;
    }
  }
  return payload;
}

// ─── Sub-components ─────────────────────────────────────────────────────
function StatusDot({ status }: { status: WebSocketConnection['status'] }) {
  const color =
    status === 'open'
      ? 'bg-emerald-400'
      : status === 'connecting'
        ? 'bg-amber-400 animate-pulse'
        : status === 'error'
          ? 'bg-rose-400'
          : 'bg-zinc-500';
  return <span className={cn('w-2 h-2 rounded-full shrink-0', color)} />;
}

function ConnectionRow({
  connection,
  isSelected,
  onSelect,
}: {
  connection: WebSocketConnection;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-2 py-1.5 border-b border-divider/30 transition-colors flex items-center gap-2 min-w-0',
        isSelected
          ? 'bg-primary/15 text-text-primary'
          : 'hover:bg-sidebar-item-hover/40 text-text-secondary hover:text-text-primary',
      )}
    >
      <StatusDot status={connection.status} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-medium truncate" title={connection.url}>
          {connection.host}
          {connection.path}
        </span>
        <span className="text-[10px] text-text-secondary truncate">
          {connection.protocol.toUpperCase()} · {connection.frames.length} frames
        </span>
      </div>
    </button>
  );
}

function FrameRow({ frame }: { frame: WebSocketFrame }) {
  const [expanded, setExpanded] = useState(false);
  const isSend = frame.direction === 'send';
  const opConfig = OPCODE_CONFIG[frame.opcode];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(frame.payload);
  };

  return (
    <div
      className={cn(
        'border-b border-divider/20 font-mono text-[11px] cursor-pointer transition-colors',
        expanded ? 'bg-table-bodyBg' : 'hover:bg-sidebar-item-hover/30',
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2 px-2 py-1">
        {isSend ? (
          <ArrowUpRight className="w-3 h-3 text-amber-400 shrink-0" />
        ) : (
          <ArrowDownLeft className="w-3 h-3 text-emerald-400 shrink-0" />
        )}
        <span className={cn('text-[10px] font-semibold shrink-0', opConfig.colorClass)}>
          {opConfig.label}
        </span>
        <span className="text-text-secondary shrink-0">{formatTimestamp(frame.timestamp)}</span>
        <span className="text-text-secondary shrink-0">{formatSize(frame.size)}</span>
        <span className="flex-1 truncate text-text-primary">{frame.payload.slice(0, 200)}</span>
        <button
          onClick={handleCopy}
          className="p-0.5 rounded text-text-secondary hover:text-primary transition-colors shrink-0"
          title="Copy payload"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
      {expanded && (
        <pre className="px-4 py-2 whitespace-pre-wrap break-all text-text-primary bg-black/20">
          {tryPrettyPayload(frame.payload)}
        </pre>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
interface WebSocketUIProps {
  /** Từ khoá tìm kiếm trong payload (đồng bộ với search bar của parent). */
  searchTerm?: string;
}

export function WebSocketUI({ searchTerm = '' }: WebSocketUIProps) {
  const connections = useWebSocketStore((s) => s.connections);
  const selectedConnectionId = useWebSocketStore((s) => s.selectedConnectionId);
  const setSelectedConnection = useWebSocketStore((s) => s.setSelectedConnection);
  const clearConnections = useWebSocketStore((s) => s.clearConnections);
  const clearFrames = useWebSocketStore((s) => s.clearFrames);

  const [directionFilter, setDirectionFilter] = useState<'all' | 'send' | 'receive'>('all');
  const [opcodeFilter, setOpcodeFilter] = useState<Set<WebSocketFrame['opcode']>>(new Set());

  const selectedConnection = useMemo(
    () => connections.find((c) => c.id === selectedConnectionId) || null,
    [connections, selectedConnectionId],
  );

  const filteredFrames = useMemo(() => {
    if (!selectedConnection) return [];
    let frames = selectedConnection.frames;
    if (directionFilter !== 'all') {
      frames = frames.filter((f) => f.direction === directionFilter);
    }
    if (opcodeFilter.size > 0) {
      frames = frames.filter((f) => opcodeFilter.has(f.opcode));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      frames = frames.filter((f) => f.payload.toLowerCase().includes(term));
    }
    return frames;
  }, [selectedConnection, directionFilter, opcodeFilter, searchTerm]);

  if (connections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-xs bg-table-bodyBg">
        <div className="text-center">
          <Circle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="font-medium mb-1">No WebSocket connections</div>
          <div className="text-[11px] opacity-70">
            WebSocket traffic will appear here once captured
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0">
      <div className="w-[280px] shrink-0 border-r border-divider/50 flex flex-col min-h-0 bg-table-bodyBg">
        <div className="flex items-center justify-between px-2 h-8 border-b border-divider/50 shrink-0">
          <span className="text-[11px] font-semibold text-text-secondary">
            Connections ({connections.length})
          </span>
          <button
            onClick={clearConnections}
            className="p-1 rounded text-text-secondary hover:text-error transition-colors"
            title="Clear all connections"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {connections.map((conn) => (
            <ConnectionRow
              key={conn.id}
              connection={conn}
              isSelected={conn.id === selectedConnectionId}
              onSelect={() => setSelectedConnection(conn.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!selectedConnection ? (
          <div className="h-full flex items-center justify-center text-text-secondary text-xs">
            Select a connection to inspect frames
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 h-8 border-b border-divider/50 shrink-0 bg-table-headerBg">
              <div className="flex items-center gap-0.5">
                {(['all', 'send', 'receive'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirectionFilter(d)}
                    className={cn(
                      'px-2 py-0.5 text-[10px] rounded transition-colors',
                      directionFilter === d
                        ? 'bg-primary/20 text-primary'
                        : 'text-text-secondary hover:bg-sidebar-item-hover/40',
                    )}
                  >
                    {d === 'all' ? 'All' : d === 'send' ? '↑ Sent' : '↓ Received'}
                  </button>
                ))}
              </div>
              <span className="text-text-secondary">|</span>
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-text-secondary" />
                {(Object.keys(OPCODE_CONFIG) as WebSocketFrame['opcode'][]).map((op) => {
                  const isActive = opcodeFilter.has(op);
                  return (
                    <button
                      key={op}
                      onClick={() => {
                        setOpcodeFilter((prev) => {
                          const next = new Set(prev);
                          if (next.has(op)) next.delete(op);
                          else next.add(op);
                          return next;
                        });
                      }}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] rounded transition-colors font-mono',
                        isActive
                          ? 'bg-primary/20 text-primary'
                          : 'text-text-secondary hover:bg-sidebar-item-hover/40',
                      )}
                    >
                      {OPCODE_CONFIG[op].label}
                    </button>
                  );
                })}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-text-secondary">
                  {filteredFrames.length} / {selectedConnection.frames.length} frames
                </span>
                <button
                  onClick={() => clearFrames(selectedConnection.id)}
                  className="p-1 rounded text-text-secondary hover:text-error transition-colors"
                  title="Clear frames"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-0">
              {filteredFrames.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                  <div className="text-center">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <div>No frames match the current filters</div>
                  </div>
                </div>
              ) : (
                filteredFrames.map((frame) => <FrameRow key={frame.id} frame={frame} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}