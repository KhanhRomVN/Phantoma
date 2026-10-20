import { useEffect, useMemo, useState } from 'react';
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
import type { GitRepoInfo } from '../../feature/Chat/hooks/workspace/useGitRepoScanner';

interface GitRepoPickerDrawerProps {
  isOpen: boolean;
  repos: GitRepoInfo[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (repo: GitRepoInfo) => void;
}

const FILTER_THRESHOLD = 5;

const COLOR = {
  branch: $('--purple'),
  staged: $('--success'),
  modified: $('--warn'),
  untracked: $('--text-secondary'),
  unpushed: $('--blue'),
  added: $('--green'),
  deleted: $('--error'),
};

const CARD_COLORS = [
  $('--yellow'),
  $('--violet'),
  $('--teal'),
  $('--pink'),
  $('--green'),
  $('--blue'),
  $('--orange'),
  $('--cyan'),
];

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

export default function GitRepoPickerDrawer({
  isOpen,
  repos,
  loading,
  error,
  onClose,
  onRefresh,
  onSelect,
}: GitRepoPickerDrawerProps) {
  const [query, setQuery] = useState('');

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

  const content = (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          zIndex: 10000,
          animation: 'grpFade .16s ease',
        }}
      />
      <div
        role="dialog"
        aria-label="Select repository"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'min(520px, 70%)',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: $('--card-background'),
          borderTop: `1px solid ${$('--border')}`,
          boxShadow: '0 -12px 40px rgba(0,0,0,.35)',
          zIndex: 10001,
          animation: 'grpSlide .26s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: $('--border'),
            margin: '8px auto 0',
            flexShrink: 0,
            opacity: 0.8,
          }}
        />

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
                fontSize: '14px',
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
                fontSize: '11.5px',
                color: $('--text-secondary'),
                opacity: 0.75,
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
                    background: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      height: '9px',
                      width: '38%',
                      borderRadius: '5px',
                      background: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                    }}
                  />
                  <div
                    style={{
                      height: '9px',
                      width: '62%',
                      borderRadius: '5px',
                      background: `color-mix(in srgb, ${$('--text-secondary')} 15%, transparent)`,
                    }}
                  />
                </div>
              </div>
            ))}

          {!loading && error && (
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
                color: $('--error'),
              }}
            >
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && repos.length === 0 && (
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
                color: $('--text-secondary'),
                opacity: 0.8,
              }}
            >
              <FolderGit2 size={20} />
              <span>No repositories found in the workspace</span>
              <small style={{ fontSize: '11px', opacity: 0.7 }}>
                Scanned up to 4 levels deep
              </small>
            </div>
          )}

          {!error && repos.length > 0 && filtered.length === 0 && (
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
                color: $('--text-secondary'),
                opacity: 0.8,
              }}
            >
              <Search size={20} />
              <span>No repositories match your filter</span>
            </div>
          )}

          {filtered.map((repo, idx) => {
              const { name, dir } = splitPath(repo.relPath);
              const hasChanges = repo.staged + repo.unstaged + repo.untracked > 0;
              const isClean = !hasChanges && repo.unpushed === 0;
              const canSelect = repo.staged > 0;
              void CARD_COLORS[idx % CARD_COLORS.length];
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
      </div>

      <style>{`
        @keyframes grpSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes grpFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes grpSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );

  return createPortal(content, document.body);
}
