import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  GitBranch,
  FolderGit2,
  RefreshCw,
  Search,
  Check,
  CircleDot,
  ArrowUp,
  FileQuestion,
  AlertTriangle,
} from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { useAgentRoot } from '../../context/AgentRootContext';
import type { GitRepoInfo } from '../../feature/Chat/hooks/workspace/useGitRepoScanner';

interface GitRepoPickerModalProps {
  isOpen: boolean;
  repos: GitRepoInfo[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (repo: GitRepoInfo) => void;
}

const FILTER_THRESHOLD = 5;

// ASSUMED: panel rộng hơn 640px thì coi là vượt chuẩn bottom sheet
const MAX_SHEET_WIDTH = 640;
const MODAL_MAX_WIDTH = 560;

const COLOR = {
  branch: $('--purple'),
  staged: $('--success'),
  modified: $('--warn'),
  untracked: $('--text-secondary'),
  unpushed: $('--blue'),
  added: $('--green'),
  deleted: $('--error'),
};

interface ChipProps {
  color: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function Chip({ color, icon, children }: ChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '1px 7px',
        height: '18px',
        fontSize: '10.5px',
        fontWeight: 500,
        borderRadius: '4px',
        whiteSpace: 'nowrap',
        color,
        backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function splitPath(relPath: string) {
  const parts = relPath.split('/').filter((p) => p && p !== '.');
  const name = parts.pop() ?? '(workspace root)';
  return { name, dir: parts.join('/') };
}

function EmptyState({ icon, color, children }: { icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '40px 16px',
        textAlign: 'center',
        fontSize: '12px',
        color,
        opacity: 0.9,
      }}
    >
      {icon}
      {children}
    </div>
  );
}

export default function GitRepoPickerModal({
  isOpen,
  repos,
  loading,
  error,
  onClose,
  onRefresh,
  onSelect,
}: GitRepoPickerModalProps) {
  const agentRoot = useAgentRoot();
  const [query, setQuery] = useState('');
  const [containerSize, setContainerSize] = useState(() => {
    const r = (agentRoot ?? document.body).getBoundingClientRect();
    return { width: r.width, height: r.height };
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = agentRoot ?? document.body;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, agentRoot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) => r.relPath.toLowerCase().includes(q) || (r.branch ?? '').toLowerCase().includes(q),
    );
  }, [repos, query]);

  if (!isOpen) return null;

  const showFilter = repos.length > FILTER_THRESHOLD;
  const isInitialLoading = loading && repos.length === 0;

  const isWide = containerSize.width > MAX_SHEET_WIDTH;
  const modalWidth = Math.min(MODAL_MAX_WIDTH, Math.max(containerSize.width - 32, 0));
  const modalHeight = Math.min(modalWidth * 1.1, containerSize.height * 0.9);

  const panelLayoutStyle: React.CSSProperties = isWide
    ? {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        margin: 'auto',
        width: modalWidth,
        height: modalHeight,
        border: `1px solid ${$('--border')}`,
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        animation: 'grpFadeScale 0.2s ease-out',
      }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '70%',
        maxHeight: '70%',
        minHeight: '260px',
        borderTop: `1px solid ${$('--border')}`,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.2)',
        animation: 'grpSlide 0.25s ease-out',
      };

  const skeletonBg = `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`;

  const content = (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 10000,
          animation: 'grpFade .16s ease',
        }}
      />
      <div
        role="dialog"
        aria-label="Select repository"
        style={{
          ...panelLayoutStyle,
          backgroundColor: $('--background'),
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          color: $('--text-primary'),
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: `1px solid ${$('--border')}`,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '17px',
                fontWeight: 700,
                color: $('--text-primary'),
              }}
            >
              Select repository
              {repos.length > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '4px',
                    color: $('--text-secondary'),
                    backgroundColor: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                  }}
                >
                  {repos.length}
                </span>
              )}
            </div>
            <div
              style={{
                marginTop: '2px',
                fontSize: '11px',
                color: $('--text-secondary'),
                opacity: 0.7,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Pick a repository with staged changes to generate a commit message.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Rescan"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '7px',
                background: 'transparent',
                color: $('--text-secondary'),
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <RefreshCw
                size={14}
                style={{ animation: loading ? 'grpSpin 1s linear infinite' : 'none' }}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '7px',
                background: 'transparent',
                color: $('--text-secondary'),
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {showFilter && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '10px 12px 0',
              padding: '0 10px',
              height: '32px',
              borderRadius: '8px',
              border: `1px solid ${$('--border')}`,
              color: $('--text-secondary'),
              flexShrink: 0,
            }}
          >
            <Search size={13} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by path or branch"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: $('--text-primary'),
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {isInitialLoading &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: skeletonBg,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{ height: '9px', width: '38%', borderRadius: '5px', background: skeletonBg }}
                  />
                  <div
                    style={{ height: '9px', width: '62%', borderRadius: '5px', background: skeletonBg }}
                  />
                </div>
              </div>
            ))}

          {!loading && error && (
            <EmptyState icon={<AlertTriangle size={20} />} color={$('--error')}>
              <span>{error}</span>
            </EmptyState>
          )}

          {!loading && !error && repos.length === 0 && (
            <EmptyState icon={<FolderGit2 size={20} />} color={$('--text-secondary')}>
              <span>No repositories found in the workspace</span>
              <small style={{ fontSize: '11px', opacity: 0.7 }}>Scanned up to 4 levels deep</small>
            </EmptyState>
          )}

          {!error && repos.length > 0 && filtered.length === 0 && (
            <EmptyState icon={<Search size={20} />} color={$('--text-secondary')}>
              <span>No repositories match your filter</span>
            </EmptyState>
          )}

          {filtered.map((repo) => {
            const { name, dir } = splitPath(repo.relPath);
            const hasChanges = repo.staged + repo.unstaged + repo.untracked > 0;
            const isClean = !hasChanges && repo.unpushed === 0;
            const canSelect = repo.staged > 0;
            return (
              <button
                key={repo.absPath}
                type="button"
                disabled={!canSelect}
                title={canSelect ? undefined : 'Nothing staged. Run git add first.'}
                onClick={() => {
                  if (canSelect) onSelect(repo);
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '10px',
                  background: canSelect
                    ? `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`
                    : `color-mix(in srgb, ${$('--text-secondary')} 7.5%, transparent)`,
                  color: 'inherit',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: canSelect ? 'pointer' : 'not-allowed',
                  opacity: canSelect ? 1 : 0.45,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: canSelect ? $('--text-primary') : $('--text-secondary'),
                    backgroundColor: canSelect
                      ? `color-mix(in srgb, ${$('--text-primary')} 8%, transparent)`
                      : `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                  }}
                >
                  <FolderGit2 size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: $('--text-primary'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        maxWidth: '70%',
                      }}
                    >
                      {name}
                    </span>
                    {dir && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: $('--text-secondary'),
                          opacity: 0.6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          direction: 'rtl',
                          textAlign: 'left',
                        }}
                      >
                        {dir}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '5px',
                      marginTop: '6px',
                    }}
                  >
                    <Chip color={COLOR.branch} icon={<GitBranch size={10} />}>
                      {repo.branch || 'detached'}
                    </Chip>
                    {(repo.added > 0 || repo.deleted > 0) && (
                      <span
                        style={{
                          display: 'inline-flex',
                          gap: '5px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '0 2px',
                        }}
                      >
                        <span style={{ color: COLOR.added }}>+{repo.added}</span>
                        <span style={{ color: COLOR.deleted }}>-{repo.deleted}</span>
                      </span>
                    )}
                    {repo.staged > 0 && (
                      <Chip color={COLOR.staged} icon={<Check size={10} />}>
                        {repo.staged} staged
                      </Chip>
                    )}
                    {repo.staged === 0 && repo.unstaged + repo.untracked > 0 && (
                      <Chip color={COLOR.modified}>Nothing staged</Chip>
                    )}
                    {repo.unstaged > 0 && (
                      <Chip color={COLOR.modified} icon={<CircleDot size={10} />}>
                        {repo.unstaged} modified
                      </Chip>
                    )}
                    {repo.untracked > 0 && (
                      <Chip color={COLOR.untracked} icon={<FileQuestion size={10} />}>
                        {repo.untracked} untracked
                      </Chip>
                    )}
                    {repo.unpushed > 0 && (
                      <Chip color={COLOR.unpushed} icon={<ArrowUp size={10} />}>
                        {repo.unpushed} unpushed
                      </Chip>
                    )}
                    {isClean && <Chip color={COLOR.untracked}>Clean</Chip>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <style>{`
          @keyframes grpSlide { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes grpFadeScale { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes grpFade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes grpSpin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );

  return createPortal(content, agentRoot ?? document.body);
}