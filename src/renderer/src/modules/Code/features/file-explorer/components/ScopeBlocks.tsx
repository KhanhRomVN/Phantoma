// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useMemo, useRef, useEffect } from 'react';

// ── Components ──
import { GutterDot } from './ScopeGutter';

// ── Hooks ──
import { useActiveBranchName } from '../hooks/useScopesBelow';

// ── Services ──
import { codeApi } from '../../../shared/api/code.api';
import { remoteDiffCache, remoteHashByRoot } from '../services/file-tree.cache';

// ── Stores ──
import {
  useBranchScope,
  useBranchScopeStore,
  isInScope,
} from '../../../shared/stores/branch-scope.store';
import {
  useScopeFilter,
  SCOPE_DIFF_DOT,
  SCOPE_DIFF_RING,
  useScopeStatsStore,
} from '../../../shared/stores/scope-stats.store';

// ── Utils ──
import { BorderRun, ScopeLayout, mergeRuns, insetRuns } from '../utils/scope-runs.util';

// ── Types ──
import { GitFileStatus } from '../types/file-explorer.types';

// ─── Component ───────────────────────────────────────────────────────────────
export function ScopeBlocks({
  containerRef,
  projectId,
  root,
  gitStatus,
  otherFiles,
  onErrorPaths,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  projectId: string;
  root: string;
  gitStatus: Record<string, GitFileStatus>;
  otherFiles: Record<string, string[]>;
  onErrorPaths: (paths: Set<string>) => void;
}) {
  // ── Derived ──
  const branchName = useActiveBranchName(projectId);
  const scope = useBranchScope(projectId, branchName);

  // ── Store ──
  const allBranchScopes = useBranchScopeStore((s) => s.scopes);

  // ── Derived ──
  const hasScopeOwner = (abs: string) => {
    const base = root.replace(/\/+$/, '');
    if (!base || !abs.startsWith(`${base}/`)) return false;
    const rel = abs.slice(base.length + 1);
    const prefix = `${projectId}::`;
    return Object.entries(allBranchScopes).some(
      ([k, paths]) =>
        k.startsWith(prefix) && k.slice(prefix.length) !== branchName && isInScope(rel, paths),
    );
  };

  // ── State ──
  const [defaultBranch, setDefaultBranch] = useState('');

  // ── Effects ──
  useEffect(() => {
    if (!root) return;
    let cancelled = false;
    codeApi.git
      .defaultBranch(root)
      .then((r) => {
        if (!cancelled) setDefaultBranch(r?.name ?? '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [root]);

  // ── Derived ──
  const isDefault = !!branchName && branchName === defaultBranch;
  const active = !!branchName && (scope.length > 0 || isDefault);

  // ── Store ──
  const setIsDefault = useScopeStatsStore((s) => s.setIsDefault);

  // ── Effects ──
  useEffect(() => {
    setIsDefault(projectId, isDefault);
  }, [projectId, isDefault, setIsDefault]);

  // ── Store ──
  const setDefaultBranchName = useScopeStatsStore((s) => s.setDefaultBranch);

  // ── Effects ──
  useEffect(() => {
    setDefaultBranchName(projectId, defaultBranch);
  }, [projectId, defaultBranch, setDefaultBranchName]);

  // ── State ──
  // ASSUMED: remoteDiff = null (không có remote/main|master hoặc lỗi) → giữ hành vi cũ (error)
  const [remoteDiff, setRemoteDiff] = useState<Set<string> | null>(() => {
    const h = remoteHashByRoot.get(root);
    return h ? (remoteDiffCache.get(`${root}\n${h}`) ?? null) : null;
  });

  // ── Refs ──
  const lastDiffKeyRef = useRef('');

  // ── State ──
  const [remoteOnly, setRemoteOnly] = useState<string[]>([]);

  // ── Derived ──
  const effectiveStatus = useMemo(() => {
    if (remoteOnly.length === 0) return gitStatus;
    const merged: Record<string, GitFileStatus> = { ...gitStatus };
    for (const p of remoteOnly) if (!(p in merged)) merged[p] = 'modified' as GitFileStatus;
    return merged;
  }, [gitStatus, remoteOnly]);

  const otherChanged = useMemo(() => new Set(Object.keys(otherFiles)), [otherFiles]);
  const candidatesKey = useMemo(() => {
    const base = root.replace(/\/+$/, '');
    return Object.keys(gitStatus)
      .filter((p) => p.startsWith(`${base}/`) && !isInScope(p.slice(base.length + 1), scope))
      .sort()
      .join('\n');
  }, [gitStatus, root, scope]);

  // ASSUMED: mọi key của gitStatus ngoài scope (kể cả file trong folder đang collapse) đều tính là file thay đổi
  const errorKey = useMemo(() => {
    if (!active || !root) return '';
    const base = root.replace(/\/+$/, '');
    return Object.keys(effectiveStatus)
      .filter(
        (p) =>
          p.startsWith(`${base}/`) &&
          !isInScope(p.slice(base.length + 1), scope) &&
          (remoteDiff === null || remoteDiff.has(p)),
      )
      .sort()
      .join('\n');
  }, [effectiveStatus, root, scope, branchName, remoteDiff]);

  // ── Effects ──
  useEffect(() => {
    onErrorPaths(new Set(errorKey ? errorKey.split('\n') : []));
  }, [errorKey, onErrorPaths]);

  // ── Derived ──
  const filter = useScopeFilter(projectId);

  // ── State ──
  const [remoteTick, setRemoteTick] = useState(0);

  // ── Effects ──
  // ASSUMED: fetch định kỳ 30s để origin/<default> luôn mới, rồi buộc tính lại diff-vs-remote
  useEffect(() => {
    if (!root || !active) return;
    let cancelled = false;
    const t = setInterval(() => {
      void codeApi.git
        .fetch(root)
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setRemoteTick((n) => n + 1);
        });
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [root, active]);

  useEffect(() => {
    if (!root || !active) {
      setRemoteDiff(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        // ASSUMED: git:diff-vs-remote được thay bằng git/remote-diff với remoteHash từ git status
        // Nếu không có remoteHash, bỏ qua remote diff
        const remoteHash = remoteHashByRoot.get(root);
        if (!remoteHash) {
          if (cancelled) return;
          setRemoteDiff(null);
          return;
        }
        const res = await codeApi.git.remoteDiff(root, remoteHash);
        if (cancelled) return;
        const next = res && res.files ? res.files : null;
        if (next && remoteHash) {
          remoteHashByRoot.set(root, remoteHash);
          remoteDiffCache.set(`${root}\n${remoteHash}`, next as Set<string>);
        }
        const key = next ? [...(next as Set<string>)].sort().join('\n') : '\0null';
        if (key === lastDiffKeyRef.current) return;
        lastDiffKeyRef.current = key;
        setRemoteOnly([]);
        setRemoteDiff(next);
      } catch {
        if (!cancelled) setRemoteDiff(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [root, branchName, scope, candidatesKey, remoteTick]);

  // ── State ──
  const [layout, setLayout] = useState<ScopeLayout>({ blocks: [], bad: [], diff: [], warn: [] });

  // ── Refs ──
  const lastJsonRef = useRef('');

  // ── Effects ──
  useEffect(() => {
    const el = containerRef.current;
    const apply = (next: ScopeLayout) => {
      const json = JSON.stringify(next);
      if (json === lastJsonRef.current) return;
      lastJsonRef.current = json;
      setLayout(next);
    };
    if (!el || !active || !root) {
      apply({ blocks: [], bad: [], diff: [], warn: [] });
      return;
    }
    const base = root.replace(/\/+$/, '');
    const compute = () => {
      const box = el.getBoundingClientRect();
      const rects = Array.from(el.querySelectorAll<HTMLElement>('[data-node-path]')).map((r) => {
        const b = r.getBoundingClientRect();
        return {
          path: r.dataset.nodePath ?? '',
          folder: r.dataset.nodeFolder === '1',
          top: Math.round(b.top - box.top + el.scrollTop),
          bottom: Math.round(b.bottom - box.top + el.scrollTop),
        };
      });
      const blocks = scope.flatMap((p, i) => {
        const abs = `${base}/${p}`;
        const hit = rects.filter((r) => r.path === abs || r.path.startsWith(`${abs}/`));
        if (hit.length === 0) return [];
        const top = Math.min(...hit.map((h) => h.top));
        const bottom = Math.max(...hit.map((h) => h.bottom));
        return [
          {
            key: p,
            index: i + 1,
            top,
            height: bottom - top,
            rows: hit.length,
            deleted: hit.length === 1 && gitStatus[hit[0].path] === 'deleted',
          },
        ];
      });
      const bad = rects
        .filter(
          (r) =>
            !r.folder &&
            !!effectiveStatus[r.path] &&
            r.path.startsWith(`${base}/`) &&
            !isInScope(r.path.slice(base.length + 1), scope),
        )
        .map((r) => ({
          path: r.path,
          top: r.top,
          height: r.bottom - r.top,
          deleted: effectiveStatus[r.path] === 'deleted',
          level: (remoteDiff === null || remoteDiff.has(r.path)
            ? otherChanged.has(r.path)
              ? 'error'
              : 'diff'
            : 'warn') as 'warn' | 'diff' | 'error',
        }));
      const mergedBlocks = mergeRuns(blocks);
      const errors = bad
        .filter((b) => b.level === 'error')
        .map(({ top, height, level, deleted }) => ({ top, height, level, rows: 1, deleted }));
      const warn = bad
        .filter((b) => b.level === 'warn')
        .map(({ top, height, deleted }) => ({ top, height, deleted }));
      const diff = bad
        .filter((b) => b.level === 'diff')
        .map(({ path, top, height, deleted }) => ({ path, top, height, deleted }));
      const all: BorderRun[] = mergedBlocks.filter((r) => (r.rows ?? 1) > 1);
      apply({
        blocks: insetRuns(mergedBlocks, all),
        bad: errors,
        diff,
        warn,
      });
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
    };
  }, [containerRef, branchName, scope, root, gitStatus, effectiveStatus, remoteDiff, otherChanged]);

  // ── Render ──
  return (
    <div className="absolute left-0 right-0 top-0 z-10 h-0 pointer-events-none">
      {(!filter || filter === 'primary') &&
        layout.blocks.map((b) =>
          b.rows > 1 ? (
            <div
              key={b.key}
              className="absolute left-1 right-1 rounded-md border border-dashed border-primary"
              style={{ top: b.top, height: b.height }}
            >
              <span className="absolute -right-px -top-px px-1.5 min-w-4 h-4 rounded-tr-md rounded-bl-md bg-primary text-white text-[10px] leading-4 text-center">
                {b.index}
              </span>
            </div>
          ) : (
            <GutterDot
              key={b.key}
              top={b.top + b.height / 2 - 4}
              dot="bg-primary"
              ring="border-primary"
              deleted={b.deleted}
            />
          ),
        )}
      {(!filter || filter === 'outside' || filter === 'error') &&
        layout.bad.map((b, i) => (
          <GutterDot
            key={i}
            top={b.top + b.height / 2 - 4}
            dot="bg-error"
            ring="border-error"
            deleted={b.deleted}
          />
        ))}
      {(!filter || filter === 'outside' || filter === 'diff') &&
        layout.diff.map((d, i) => (
          <GutterDot
            key={`d${i}`}
            top={d.top + d.height / 2 - 4}
            dot={SCOPE_DIFF_DOT}
            ring={SCOPE_DIFF_RING}
            deleted={d.deleted}
            onClick={
              hasScopeOwner(d.path)
                ? () =>
                    window.dispatchEvent(
                      new CustomEvent('explorer:scope-transfer', { detail: { path: d.path } }),
                    )
                : undefined
            }
          />
        ))}
      {(!filter || filter === 'outside' || filter === 'warn') &&
        layout.warn.map((w, i) => (
          <GutterDot
            key={`w${i}`}
            top={w.top + w.height / 2 - 4}
            dot="bg-warn"
            ring="border-warn"
            deleted={w.deleted}
          />
        ))}
    </div>
  );
}
