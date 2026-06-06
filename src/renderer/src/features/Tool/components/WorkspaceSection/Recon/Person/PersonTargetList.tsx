// ============================================================================
// SERVER TARGET LIST — Manage target domains with right-click context menu
// ============================================================================
import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../../../../../shared/lib/utils';
import { DEFAULT_SESSIONS } from './mockData';

export type DomainStatus = 'idle' | 'queued' | 'scanning' | 'done' | 'error';

export interface DomainSession {
  id: string;
  domain: string;
  ip?: string;
  status: DomainStatus;
  progress: number;
  riskScore?: number;
  stats?: {
    openPorts: number;
    subdomains: number;
    vulns: number;
    breaches: number;
    secrets: number;
  };
}

const STATUS_META: Record<DomainStatus, { label: string; color: string; pulse?: boolean }> = {
  idle: { label: 'IDLE', color: '#3a4558' },
  queued: { label: 'QUEUED', color: '#f5a623', pulse: true },
  scanning: { label: 'SCANNING', color: '#0af', pulse: true },
  done: { label: 'DONE', color: '#30d158' },
  error: { label: 'ERROR', color: '#ff2d55' },
};

interface Props {
  activeDomain: string;
  onSelectDomain: (domain: string) => void;
}

export function PersonTargetList({ activeDomain, onSelectDomain }: Props) {
  const [sessions, setSessions] = useState<DomainSession[]>(DEFAULT_SESSIONS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sessionId: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const addDomain = useCallback(() => {
    const d = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!d) return;
    if (sessions.some((s) => s.domain === d)) return;
    const sess: DomainSession = {
      id: `sess-${Date.now()}`,
      domain: d,
      status: 'queued',
      progress: 0,
      stats: { openPorts: 0, subdomains: 0, vulns: 0, breaches: 0, secrets: 0 },
    };
    setSessions((prev) => [...prev, sess]);
    setNewDomain('');
    setShowAddForm(false);
  }, [newDomain, sessions]);

  const removeDomain = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const runDomain = useCallback((domain: string) => {
    // TODO: Implement full scan logic
    console.log('Running full scan for:', domain);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sessionId });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="w-[293px] bg-[#060810] border-r border-[#1c2333] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-[40px] border-b border-[#1c2333] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full bg-[#0af]" />
          <span className="text-[14px] font-bold tracking-[0.12em] text-[#c8d6f0] font-mono">
            People
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-[#2a3548] hover:text-[#0af] hover:bg-[#0af15] transition-all p-1 rounded"
          title="Add domain"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Add form (conditionally shown) */}
      {showAddForm && (
        <div className="p-2 border-b border-[#1c2333] shrink-0">
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addDomain();
                if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewDomain('');
                }
              }}
              placeholder="example.com"
              spellCheck={false}
              className="flex-1 h-7 bg-[#040608] border border-[#1c2333] rounded px-2 text-[11px] font-mono text-[#0af] outline-none placeholder:text-[#2a3548]"
              style={{ caretColor: '#0af' }}
            />
            <button
              onClick={addDomain}
              className="h-7 w-7 rounded text-[11px] font-bold font-mono transition-colors"
              style={{ background: '#0af15', border: '1px solid #0af30', color: '#0af' }}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sessions.map((sess) => {
          const meta = STATUS_META[sess.status];
          const isActive = sess.domain === activeDomain;
          return (
            <div
              key={sess.id}
              onClick={() => onSelectDomain(sess.domain)}
              onContextMenu={(e) => handleContextMenu(e, sess.id)}
              className={cn(
                'p-2 rounded cursor-pointer transition-all relative',
                isActive ? 'bg-[#0d1017]' : 'bg-[#0a0e14] hover:bg-[#111827]',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#0af] rounded-full" />
              )}
              <div className="flex items-center gap-2 pl-1">
                <div
                  className={cn('w-2 h-2 rounded-full', meta.pulse && 'animate-pulse')}
                  style={{ background: meta.color }}
                />
                <span
                  className="text-[13px] font-mono font-bold flex-1 truncate"
                  style={{ color: isActive ? '#c8d6f0' : '#6a7a9a' }}
                >
                  {sess.domain}
                </span>
                <span className="text-[10px] font-mono text-[#0af]">{sess.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#0d1017] border border-[#1c2333] rounded shadow-lg py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              const session = sessions.find((s) => s.id === contextMenu.sessionId);
              if (session) runDomain(session.domain);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#0af] hover:bg-[#1c2333] transition-colors"
          >
            ▶ Run (Full Scan)
          </button>
          <button
            onClick={() => {
              removeDomain(contextMenu.sessionId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-[#ff2d55] hover:bg-[#1c2333] transition-colors"
          >
            ✕ Delete
          </button>
        </div>
      )}
    </div>
  );
}