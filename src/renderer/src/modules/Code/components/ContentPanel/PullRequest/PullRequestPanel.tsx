/**
 * ------------------------------------------------------------------
 * Pull Request Panel
 * ------------------------------------------------------------------
 * Quản lý Pull Request GitHub của một project thông qua GitHub CLI
 * (gh) ở main process (channels 'pr:*').
 *
 * Main features:
 * - Cột trái: bộ lọc trạng thái, tìm kiếm, danh sách PR dạng card,
 *   skeleton khi tải và empty state theo bộ lọc
 * - Cột phải: chi tiết PR dạng tab (overview, commits, files,
 *   conversation) hoặc form tạo PR mới
 * - Hành động: tạo, merge, close / reopen, ready, approve, comment
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';

import { cn } from '@renderer/utils/cn';
import { PrBlocker } from './PrBlocker';
import { PrCard } from './PrCard';
import { PrCreateForm, type CreateFormState } from './PrCreateForm';
import { PrDetail } from './PrDetail';
import { PrDetailEmpty, PrListEmpty } from './PrEmptyState';
import { PrDetailSkeleton, PrListSkeleton } from './PrSkeleton';
import {
  FILTERS,
  type Filter,
  type MergeMethod,
  type PullRequest,
  type PullRequestDetail,
  type StatusInfo,
} from './types';
import { BTN } from './utils';

interface PullRequestPanelProps {
  projectPath: string;
  currentBranch: string | null;
  defaultBranch: string;
  onNotice: (msg: string) => void;
}

// ─── Main Component ─────────────────────────────────────────────────────
export const PullRequestPanel = memo(function PullRequestPanel({
  projectPath,
  currentBranch,
  defaultBranch,
  onNotice,
}: PullRequestPanelProps) {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const [query, setQuery] = useState('');
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<PullRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('squash');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>({ title: '', body: '', draft: false });

  const ready = !!(status && status.installed && status.authenticated && status.repo);
  const baseBranch = defaultBranch || status?.repo?.defaultBranch || '';
  const onDefault = !!currentBranch && currentBranch === baseBranch;
  const canCreate = !!currentBranch && !onDefault && form.title.trim() !== '' && !busy;

  const loadStatus = useCallback(async (): Promise<StatusInfo> => {
    let next: StatusInfo;
    try {
      const res = await window.api.invoke('pr:status', projectPath);
      next = res ?? { installed: false, authenticated: false };
    } catch (e: any) {
      next = { installed: true, authenticated: true, error: e?.message ?? String(e) };
    }
    setStatus(next);
    return next;
  }, [projectPath]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.invoke('pr:list', projectPath, filter, 50);
      if (res?.error) {
        setError(String(res.error));
        setPrs([]);
      } else {
        setPrs(res?.prs ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPrs([]);
    } finally {
      setLoading(false);
    }
  }, [projectPath, filter]);

  const loadDetail = useCallback(
    async (n: number) => {
      setDetailLoading(true);
      try {
        const res = await window.api.invoke('pr:view', projectPath, n);
        if (res?.error) {
          onNotice(String(res.error).split('\n')[0]);
          setDetail(null);
        } else {
          setDetail(res?.pr ?? null);
        }
      } catch {
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [projectPath, onNotice],
  );

  useEffect(() => {
    setStatus(null);
    setSelected(null);
    setDetail(null);
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (ready) void loadList();
  }, [ready, loadList]);

  useEffect(() => {
    if (selected === null) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setComment('');
    void loadDetail(selected);
  }, [selected, loadDetail]);

  const runAction = useCallback(
    async (channel: string, args: unknown[], okMsg: string) => {
      if (selected === null) return;
      setBusy(true);
      try {
        const res = await window.api.invoke(channel, projectPath, selected, ...args);
        if (res?.error) {
          onNotice(String(res.error).split('\n')[0]);
          return;
        }
        onNotice(okMsg);
        await Promise.all([loadList(), loadDetail(selected)]);
        window.dispatchEvent(new CustomEvent('phantoma:git-refresh'));
      } finally {
        setBusy(false);
      }
    },
    [selected, projectPath, onNotice, loadList, loadDetail],
  );

  const submitComment = useCallback(async () => {
    const text = comment.trim();
    if (!text) return;
    await runAction('pr:comment', [text], 'Comment added');
    setComment('');
  }, [comment, runAction]);

  const submitCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const res = await window.api.invoke('pr:create', projectPath, {
        title: form.title,
        body: form.body,
        base: baseBranch || undefined,
        head: currentBranch || undefined,
        draft: form.draft,
        push: true,
      });
      if (res?.error) {
        onNotice(String(res.error).split('\n')[0]);
        return;
      }
      onNotice('Pull request created');
      setCreateOpen(false);
      setForm({ title: '', body: '', draft: false });
      setFilter('open');
      await loadList();
      window.dispatchEvent(new CustomEvent('phantoma:git-refresh'));
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = useCallback((n: number) => {
    setCreateOpen(false);
    setSelected(n);
  }, []);

  const copyHash = useCallback(
    (hash: string) => {
      void navigator.clipboard
        .writeText(hash)
        .then(() => onNotice(`Copied ${hash.slice(0, 7)}`))
        .catch(() => {});
    },
    [onNotice],
  );

  const openCreate = useCallback(() => {
    setSelected(null);
    setCreateOpen(true);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prs;
    return prs.filter((p) =>
      `${p.title} ${p.number} ${p.author?.login ?? ''} ${p.headRefName} ${p.baseRefName}`
        .toLowerCase()
        .includes(q),
    );
  }, [prs, query]);

  // ── Blocking states ──
  if (!status) {
    return (
      <div className={'flex-1 flex items-center justify-center text-text-secondary/50'}>
        <Loader2 className={'w-4 h-4 animate-spin'} />
      </div>
    );
  }

  if (!ready) {
    return (
      <PrBlocker
        projectPath={projectPath}
        status={status}
        loadStatus={loadStatus}
        onNotice={onNotice}
      />
    );
  }

  // ── Right pane ──
  const renderRight = () => {
    if (createOpen) {
      return (
        <div className={'flex-1 min-h-0 overflow-y-auto'}>
          <PrCreateForm
            currentBranch={currentBranch}
            baseBranch={baseBranch}
            onDefault={onDefault}
            form={form}
            busy={busy}
            canCreate={canCreate}
            onChange={setForm}
            onCancel={() => setCreateOpen(false)}
            onSubmit={() => void submitCreate()}
          />
        </div>
      );
    }
    if (selected === null) return <PrDetailEmpty />;
    if (!detail) {
      return detailLoading ? (
        <div className={'flex-1 min-h-0 overflow-y-auto'}>
          <PrDetailSkeleton />
        </div>
      ) : (
        <PrDetailEmpty />
      );
    }
    return (
      <PrDetail
        key={detail.number}
        detail={detail}
        busy={busy}
        mergeMethod={mergeMethod}
        comment={comment}
        onMergeMethodChange={setMergeMethod}
        onCommentChange={setComment}
        onAction={(channel, args, okMsg) => void runAction(channel, args, okMsg)}
        onSubmitComment={() => void submitComment()}
        onCopyHash={copyHash}
      />
    );
  };

  return (
    <div className={'flex-1 min-h-0 flex'}>
      <div className={'w-[400px] shrink-0 min-h-0 flex flex-col border-r border-border'}>
        <div className={'h-11 shrink-0 px-3 flex items-center gap-1 border-b border-border'}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-7 px-2.5 rounded-md text-[12px] font-medium outline-none cursor-pointer transition-colors inline-flex items-center gap-1.5',
                filter === f.id
                  ? 'bg-button-soft-background text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-card-hover',
              )}
            >
              {f.label}
              {filter === f.id && !loading && !error && (
                <span className={'font-mono text-[10.5px] opacity-70'}>{prs.length}</span>
              )}
            </button>
          ))}
          <span className={'flex-1'} />
          <button
            onClick={() => void loadList()}
            disabled={loading}
            title={'Refresh'}
            className={'grid h-7 w-7 place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-card-hover hover:text-text-primary cursor-pointer disabled:opacity-50'}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={openCreate}
            title={'New pull request'}
            className={'grid h-7 w-7 place-items-center rounded-md text-primary outline-none transition-colors hover:bg-card-hover cursor-pointer'}
          >
            <Plus className={'w-4 h-4'} />
          </button>
        </div>

        <div className={'shrink-0 px-3 py-2 border-b border-border'}>
          <div className={'relative'}>
            <Search className={'absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/60 pointer-events-none'} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'Search title, author, branch...'}
              spellCheck={false}
              className={'w-full h-8 pl-8 pr-8 text-xs bg-input-background border border-border rounded-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50'}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className={'absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer'}
              >
                <X className={'w-3.5 h-3.5'} />
              </button>
            )}
          </div>
        </div>

        <div className={'flex-1 min-h-0 overflow-y-auto'}>
          {loading && prs.length === 0 ? (
            <PrListSkeleton />
          ) : error ? (
            <div className={'flex flex-col items-center gap-3 px-6 py-12 text-center'}>
              <div className={'w-12 h-12 rounded-2xl bg-error/10 border border-error/30 grid place-items-center'}>
                <AlertCircle className={'w-6 h-6 text-error'} />
              </div>
              <p className={'text-xs leading-relaxed text-error break-words'}>{error}</p>
              <button onClick={() => void loadList()} className={BTN}>
                <RefreshCw className={'w-3.5 h-3.5'} />
                Retry
              </button>
            </div>
          ) : visible.length === 0 ? (
            query.trim() ? (
              <div className={'py-12 text-center text-xs text-text-secondary/50'}>
                No pull requests match your search
              </div>
            ) : (
              <PrListEmpty filter={filter} onCreate={openCreate} />
            )
          ) : (
            <div className={'py-1'}>
              {visible.map((pr) => (
                <PrCard
                  key={pr.number}
                  pr={pr}
                  selected={selected === pr.number && !createOpen}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={'flex-1 min-w-0 min-h-0 flex flex-col'}>{renderRight()}</div>
    </div>
  );
});

PullRequestPanel.displayName = 'PullRequestPanel';

export default PullRequestPanel;