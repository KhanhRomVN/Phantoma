import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCopy,
  Copy,
  Layers,
  ListChecks,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Dropdown } from '@renderer/components/ui/Dropdown/Dropdown';
import { DropdownTrigger } from '@renderer/components/ui/Dropdown/DropdownTrigger';
import { DropdownContent } from '@renderer/components/ui/Dropdown/DropdownContent';
import { DropdownItem, DropdownSeparator } from '@renderer/components/ui/Dropdown/DropdownItem';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { Profile, SyncState, TransferPlanItem, TransferJob } from '../../../../shared/types';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { profileApi } from '../../../../shared/api/profile.api';
import { Pill } from '../../../../shared/components/Pill';
import { SyncBadge } from '../../../../shared/components/SyncBadge';
import { CANCEL_BTN, CONFIRM_BTN, InputField, NativeSelect } from '../../../../shared/components/FormBits';
import { ConfirmTransferModal } from '../modals/ConfirmTransfer/ConfirmTransferModal';
import {
  TransferMode,
  DuplicatePolicy,
  SourceTransferModalProps,
  RowFilter,
  SortKey,
  SortState,
} from './source-transfer.types';
import {
  FILTERS,
  MODE_META,
  MODE_TEXT,
  MODE_THUMB,
  POLICY_LABEL,
  POLICY_HINT,
  LEVEL,
  seg,
  SOFT_TOOL_BTN,
} from './source-transfer.constants';
import { loadLast, saveLast, conflictDetail, nextFolderOf } from '../../utils/source-transfer.util';
import { FolderCell, SourceCard, SortHead } from './SourceTransferParts';

export function SourceTransferModal({ isOpen, onClose, profiles, sources, runningIds, onFinished }: SourceTransferModalProps) {
  const [targetId, setTargetId] = useState<string | null>(() => {
    const id = loadLast().targetId;
    const originIds = new Set(profiles.map((p) => p.sourceId));
    const isOnlyOrigin = originIds.size === 1 && !!id && originIds.has(id);
    return id && !isOnlyOrigin && sources.some((s) => s.id === id) ? id : null;
  });
  const [mode, setMode] = useState<TransferMode>(() => loadLast().mode);
  const [policy, setPolicy] = useState<DuplicatePolicy>('merge');
  const [rowPolicy, setRowPolicy] = useState<Record<string, DuplicatePolicy>>({});
  const [plan, setPlan] = useState<TransferPlanItem[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<RowFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'no', dir: 'asc' });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);


  const idsKey = profiles.map((p) => p.id).join('|');
  const meta = MODE_META[mode];
  const ModeIcon = meta.icon;

  const syncById = useMemo(() => new Map(profiles.map((p) => [p.id, p.chromeSync] as const)), [profiles]);
  const syncOf = (item: TransferPlanItem): SyncState => syncById.get(item.id) ?? 'unsynced';

  const origins = useMemo(() => {
    const counts = new Map<string, number>();
    profiles.forEach((p) => counts.set(p.sourceId, (counts.get(p.sourceId) ?? 0) + 1));
    return Array.from(counts, ([id, count]) => ({ source: sources.find((s) => s.id === id) ?? null, count }));
  }, [profiles, sources]);

  const targets = useMemo(() => {
    const originIds = new Set(profiles.map((p) => p.sourceId));
    return originIds.size === 1 ? sources.filter((s) => !originIds.has(s.id)) : sources;
  }, [profiles, sources]);

  const target = targets.find((s) => s.id === targetId) ?? null;

  useEffect(() => {
    if (!targetId) {
      setPlan(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    profileApi.profiles
      .transferPreview(idsKey.split('|').filter(Boolean), targetId)
      .then((items) => {
        if (cancelled) return;
        setPlan(items);
        setRowPolicy({});
        setPicked(new Set(items.filter((i) => !i.blocked).map((i) => i.id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setPlan(null);
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, idsKey]);

  const blockedReason = (item: TransferPlanItem): string | null =>
    item.blocked ?? (runningIds.has(item.id) ? 'Browser is running, stop it first' : null);

  const policyOf = (item: TransferPlanItem): DuplicatePolicy => rowPolicy[item.id] ?? policy;

  const statusLabel = (item: TransferPlanItem): string =>
    blockedReason(item) ? 'Blocked' : item.conflict ? LEVEL[item.conflict.level].label : 'New';

  const statusRank = (item: TransferPlanItem): number => {
    if (blockedReason(item)) return 4;
    if (!item.conflict) return 0;
    return item.conflict.level === 'identical' ? 1 : item.conflict.level === 'mergeable' ? 2 : 3;
  };

  const rows = useMemo(() => (plan ?? []).map((item, idx) => ({ item, no: idx + 1 })), [plan]);

  const needle = query.trim().toLowerCase();
  const sign = sort.dir === 'asc' ? 1 : -1;

  const visible = rows
    .filter(({ item }) => {
      const blocked = !!blockedReason(item);
      if (filter === 'blocked' && !blocked) return false;
      if (filter === 'new' && (blocked || item.conflict)) return false;
      if (filter === 'duplicate' && (blocked || !item.conflict)) return false;
      if (filter === 'unsynced' && (blocked || syncOf(item) === 'synced')) return false;
      if (!needle) return true;
      return [item.email, item.oldFolder, nextFolderOf(item), statusLabel(item)].some((v) => v.toLowerCase().includes(needle));
    })
    .sort((a, b) => {
      if (sort.key === 'email') return a.item.email.localeCompare(b.item.email) * sign;
      if (sort.key === 'folder') return nextFolderOf(a.item).localeCompare(nextFolderOf(b.item), undefined, { numeric: true }) * sign;
      if (sort.key === 'status') return (statusRank(a.item) - statusRank(b.item)) * sign;
      return (a.no - b.no) * sign;
    });

  const onSort = (key: SortKey): void =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const selectable = visible.filter(({ item }) => !blockedReason(item));
  const allPicked = selectable.length > 0 && selectable.every(({ item }) => picked.has(item.id));

  const mutatePicked = (fn: (next: Set<string>) => void): void =>
    setPicked((prev) => {
      const next = new Set(prev);
      fn(next);
      return next;
    });

  const toggleAll = (value: boolean): void =>
    mutatePicked((n) => selectable.forEach(({ item }) => (value ? n.add(item.id) : n.delete(item.id))));

  const toggleOne = (id: string, value: boolean): void =>
    mutatePicked((n) => {
      if (value) n.add(id);
      else n.delete(id);
    });

  const invertVisible = (): void =>
    mutatePicked((n) => selectable.forEach(({ item }) => (n.has(item.id) ? n.delete(item.id) : n.add(item.id))));

  const untickWhere = (pred: (item: TransferPlanItem) => boolean): void =>
    mutatePicked((n) => rows.forEach(({ item }) => pred(item) && n.delete(item.id)));

  const chosen = rows.map((r) => r.item).filter((i) => picked.has(i.id) && !blockedReason(i));
  const acting = chosen.filter((i) => !i.conflict || policyOf(i) !== 'skip');
  const counts = {
    fresh: chosen.filter((i) => !i.conflict).length,
    merge: chosen.filter((i) => i.conflict && policyOf(i) === 'merge').length,
    overwrite: chosen.filter((i) => i.conflict && policyOf(i) === 'overwrite').length,
    skip: chosen.filter((i) => i.conflict && policyOf(i) === 'skip').length,
    unsynced: acting.filter((i) => syncOf(i) !== 'synced').length,
  };
  const actionable = counts.fresh + counts.merge + counts.overwrite;
  const renamed = chosen.filter((i) => !i.conflict && i.oldFolder !== i.newFolder).length;
  const chromeTarget = (plan ?? []).some((i) => i.folderRule === 'chrome');

  const stats = {
    fresh: rows.filter(({ item }) => !blockedReason(item) && !item.conflict).length,
    dup: rows.filter(({ item }) => !blockedReason(item) && !!item.conflict).length,
    unsynced: rows.filter(({ item }) => !blockedReason(item) && syncOf(item) !== 'synced').length,
    blocked: rows.filter(({ item }) => !!blockedReason(item)).length,
  };

  const copyPlan = async (): Promise<void> => {
    const header = ['STT', 'Email', 'Old folder', 'New folder', 'Sync', 'Status'].join('\t');
    const lines = visible.map(({ item, no }) =>
      [no, item.email, item.oldFolder, nextFolderOf(item), syncOf(item), statusLabel(item)].join('\t'),
    );
    try {
      await navigator.clipboard.writeText([header, ...lines].join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleClose = (): void => {
    if (!confirmOpen) onClose();
  };

  const finish = (job: TransferJob | null): void => {
    if (targetId) saveLast(mode, targetId);
    setConfirmOpen(false);
    void onFinished(job);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className='max-w-4xl'>
      <div className='flex shrink-0 items-center gap-3 border-b border-border px-5 py-3'>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300', TONE_CLASS[meta.tone].icon)}>
          <ModeIcon className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <h3 className='text-base font-bold text-text-primary'>{meta.title}</h3>
          <p className='mt-0.5 truncate text-xs text-text-secondary'>
            {profiles.length} selected profile{profiles.length > 1 ? 's' : ''} - {meta.hint}
          </p>
        </div>
        <div className='relative flex w-56 shrink-0 rounded-lg bg-text-secondary/10'>
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-1/2 p-0.5 transition-transform duration-300 ease-out',
              mode === 'duplicate' && 'translate-x-full',
            )}
          >
            <div className={cn('h-full w-full rounded-md transition-colors duration-300', MODE_THUMB[mode])} />
          </div>
          {(['move', 'duplicate'] as TransferMode[]).map((m) => {
            const Icon = MODE_META[m].icon;
            return (
              <button
                key={m}
                type='button'
                onClick={() => setMode(m)}
                className={cn(
                  'relative z-10 flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-300',
                  mode === m ? MODE_TEXT[m] : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon className='h-3.5 w-3.5' />
                {m === 'move' ? 'Move' : 'Duplicate'}
              </button>
            );
          })}
        </div>
        <button
          type='button'
          onClick={handleClose}
          className='shrink-0 cursor-pointer rounded-md bg-card-background p-1.5 text-text-secondary transition-colors hover:bg-error/15 hover:text-error'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
      <ModalBody className='flex flex-col gap-4 py-4'>
        <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2'>
          {origins.length === 1 ? (
            <SourceCard
              label='From'
              name={origins[0].source?.name ?? 'Unknown source'}
              detail={origins[0].source?.location ?? 'No folder'}
              extra={`${origins[0].count}`}
            />
          ) : (
            <SourceCard
              label='From'
              name={`${origins.length} sources`}
              detail={origins.map((o) => o.source?.name ?? 'Unknown').join(', ')}
              extra={`${profiles.length}`}
            />
          )}
          <span className={cn('mb-1.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300', TONE_CLASS[meta.tone].icon)}>
            <ArrowRight className='h-3.5 w-3.5' />
          </span>
          <div className='flex min-w-0 flex-col gap-1'>
            <span className='text-[10px] font-medium uppercase tracking-wider text-text-secondary'>To</span>
            <Dropdown className='w-full' align='start' sideOffset={4}>
              <DropdownTrigger>
                <button
                  type='button'
                  className='flex w-full items-center gap-3 rounded-md bg-card-background px-3 py-2 text-left transition-colors hover:bg-text-secondary/10'
                >
                  <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', TONE_CLASS[meta.tone].icon)}>
                    <Layers className='h-3.5 w-3.5' />
                  </span>
                  <div className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate text-xs font-medium text-text-primary'>{target ? target.name : 'Choose destination'}</span>
                    <span className='truncate font-mono text-[11px] text-text-secondary'>
                      {target ? (target.location ?? 'No folder') : `${targets.length} available`}
                    </span>
                  </div>
                  <ChevronDown className='h-3.5 w-3.5 shrink-0 text-text-secondary' />
                </button>
              </DropdownTrigger>
              <DropdownContent className='max-h-56 overflow-y-auto'>
                {targets.length === 0 && <div className='px-3 py-2 text-xs text-text-secondary'>No other source available</div>}
                {targets.map((s) => (
                  <DropdownItem key={s.id} noPadding className='px-2 py-1.5' onClick={() => setTargetId(s.id)}>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_CLASS.primary.icon)}>
                      <Layers className='h-3 w-3' />
                    </span>
                    <span className='flex min-w-0 flex-col gap-1'>
                      <span className='truncate text-xs font-medium'>{s.name}</span>
                      <span className='truncate font-mono text-[11px] text-text-secondary'>{s.location ?? 'No folder'}</span>
                    </span>
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          </div>
        </div>

        {!targetId && <p className='text-xs text-text-secondary'>Choose a destination source to preview the transfer.</p>}
        {loading && (
          <div className='flex items-center gap-2 text-xs text-text-secondary'>
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
            Analyzing profile folders...
          </div>
        )}
        {loadError && <p className='rounded-md bg-error/10 p-3 text-xs text-error'>{loadError}</p>}
        {targetId && !loading && !loadError && plan && plan.length === 0 && (
          <p className='text-xs text-text-secondary'>All selected profiles are already in this source.</p>
        )}

        {plan && plan.length > 0 && !loading && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <Pill tone='success'>{stats.fresh} new</Pill>
                <Pill tone='warn'>{stats.dup} duplicate</Pill>
                {stats.unsynced > 0 && <Pill tone='info'>{stats.unsynced} unsynced</Pill>}
                {renamed > 0 && (
                  <Pill tone='primary'>
                    {renamed} folder{renamed > 1 ? 's' : ''} renamed
                  </Pill>
                )}
                {stats.blocked > 0 && <Pill tone='error'>{stats.blocked} blocked</Pill>}
              </div>
              <div className='flex gap-1 rounded-md bg-text-secondary/10 p-0.5'>
                {FILTERS.map((f) => (
                  <button key={f.id} type='button' className={cn(seg(filter === f.id), 'flex-none px-2.5 py-1 text-[11px]')} onClick={() => setFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <div className='relative min-w-0 flex-1'>
                <Search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary' />
                <InputField
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Search email, folder or status...'
                  className='py-1.5 pl-8 pr-8 text-xs'
                />
                {query && (
                  <button
                    type='button'
                    onClick={() => setQuery('')}
                    className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary transition-colors hover:text-text-primary'
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                )}
              </div>
              <Dropdown align='end' sideOffset={4}>
                <DropdownTrigger>
                  <button type='button' className={SOFT_TOOL_BTN}>
                    <ListChecks className='h-3.5 w-3.5' />
                    Select
                    <ChevronDown className='h-3 w-3' />
                  </button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem onClick={() => toggleAll(true)}>Select all shown</DropdownItem>
                  <DropdownItem onClick={invertVisible}>Invert shown</DropdownItem>
                  <DropdownItem onClick={() => setPicked(new Set())}>Clear selection</DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onClick={() => untickWhere((i) => syncOf(i) !== 'synced')}>Untick unsynced</DropdownItem>
                  <DropdownItem onClick={() => untickWhere((i) => !!i.conflict)}>Untick duplicates</DropdownItem>
                  <DropdownItem onClick={() => untickWhere((i) => i.conflict?.level === 'conflict')}>Untick conflicts</DropdownItem>
                </DropdownContent>
              </Dropdown>
              <button type='button' className={SOFT_TOOL_BTN} onClick={() => void copyPlan()} title='Copy the shown rows as a table'>
                {copied ? <Check className='h-3.5 w-3.5 text-success' /> : <ClipboardCopy className='h-3.5 w-3.5' />}
                {copied ? 'Copied' : 'Copy plan'}
              </button>
            </div>

            <div className='max-h-72 overflow-auto rounded-lg bg-card-background'>
              <table className='w-full text-left text-xs'>
                <thead className='sticky top-0 z-10 bg-card-background text-[11px] text-text-secondary'>
                  <tr>
                    <th className='w-9 px-3 py-2'>
                      <Checkbox size='sm' checked={allPicked} disabled={selectable.length === 0} onChange={toggleAll} />
                    </th>
                    <SortHead label='STT' k='no' sort={sort} onSort={onSort} className='w-12' />
                    <SortHead label='Email' k='email' sort={sort} onSort={onSort} className='pr-3' />
                    <SortHead label='Folder name' k='folder' sort={sort} onSort={onSort} className='pr-3' />
                    <th className='w-24 py-2 pr-3 font-medium'>Sync</th>
                    <SortHead label='Status' k='status' sort={sort} onSort={onSort} className='w-36 pr-3' />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ item, no }) => {
                    const reason = blockedReason(item);
                    const on = picked.has(item.id) && !reason;
                    const c = item.conflict;
                    return (
                      <tr key={item.id} className={cn('transition-colors hover:bg-text-secondary/5', !on && 'opacity-60')}>
                        <td className='px-3 py-1.5 align-top'>
                          <Checkbox size='sm' checked={on} disabled={!!reason} onChange={(v) => toggleOne(item.id, v)} />
                        </td>
                        <td className='py-1.5 align-top text-text-secondary'>{no}</td>
                        <td className='max-w-[220px] py-1.5 pr-3 align-top'>
                          <div className='truncate text-text-primary' title={item.email}>
                            {item.email}
                          </div>
                          {reason && (
                            <div className='truncate text-[11px] text-error' title={reason}>
                              {reason}
                            </div>
                          )}
                          {!reason && c && (
                            <div className='truncate text-[11px] text-text-secondary' title={conflictDetail(item)}>
                              {conflictDetail(item)}
                            </div>
                          )}
                        </td>
                        <td className='max-w-[240px] py-1.5 pr-3 align-top'>
                          <FolderCell item={item} />
                        </td>
                        <td className='py-1.5 pr-3 align-top'>
                          <SyncBadge state={syncOf(item)} />
                        </td>
                        <td className='py-1.5 pr-3 align-top'>
                          <div className='flex flex-col items-start gap-1'>
                            {reason ? (
                              <Pill tone='error'>Blocked</Pill>
                            ) : c ? (
                              <>
                                <Pill tone={LEVEL[c.level].tone}>{LEVEL[c.level].label}</Pill>
                                <NativeSelect
                                  value={policyOf(item)}
                                  disabled={!on}
                                  className='w-28 rounded-md py-1 text-[11px]'
                                  onChange={(e) => setRowPolicy((prev) => ({ ...prev, [item.id]: e.target.value as DuplicatePolicy }))}
                                >
                                  <option value='skip'>{POLICY_LABEL.skip}</option>
                                  <option value='merge'>{POLICY_LABEL.merge}</option>
                                  {c.level === 'conflict' && <option value='overwrite'>{POLICY_LABEL.overwrite}</option>}
                                </NativeSelect>
                              </>
                            ) : (
                              <Pill tone='success'>New</Pill>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={6} className='px-3 py-6 text-center text-text-secondary'>
                        No profiles match
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {stats.dup > 0 && (
              <div className='flex flex-col gap-2 rounded-lg bg-card-background p-3.5 text-xs text-text-secondary'>
                <span className='text-[11px]'>Duplicates (same email already in the destination):</span>
                <div className='flex gap-1 rounded-md bg-text-secondary/10 p-0.5'>
                  {(['merge', 'skip', 'overwrite'] as DuplicatePolicy[]).map((p) => (
                    <button
                      key={p}
                      type='button'
                      className={seg(policy === p)}
                      onClick={() => {
                        setPolicy(p);
                        setRowPolicy({});
                      }}
                    >
                      {POLICY_LABEL[p]}
                    </button>
                  ))}
                </div>
                <span className='text-[11px]'>{POLICY_HINT[policy]} Each row can override this.</span>
              </div>
            )}

            <p className='text-[11px] text-text-secondary'>
              {chromeTarget
                ? 'Destination is a Chrome user-data-dir: new folders follow Chrome naming (Profile N), so they are not renamed to the email.'
                : 'Folder names that do not match the profile email are rewritten to the email (old -> new). Duplicates keep the folder that already exists in the destination.'}
              {' '}Unsynced profiles can still be transferred; you will be warned again at confirmation.
            </p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <span className='mr-auto text-xs text-text-secondary'>{plan ? `${chosen.length} of ${rows.length} selected` : ''}</span>
        <Button onClick={handleClose} className={CANCEL_BTN}>
          Cancel
        </Button>
        <Button disabled={!targetId || loading || actionable === 0} onClick={() => setConfirmOpen(true)} className={CONFIRM_BTN}>
          {mode === 'move' ? 'Move' : 'Duplicate'}
          {actionable > 0 ? ` (${actionable})` : ''}
        </Button>
      </ModalFooter>

      {confirmOpen && targetId && (
        <ConfirmTransferModal
          isOpen
          onClose={() => setConfirmOpen(false)}
          onFinished={finish}
          request={{
            mode,
            targetId,
            ids: chosen.map((i) => i.id),
            policy,
            policies: Object.fromEntries(chosen.filter((i) => i.conflict).map((i) => [i.id, policyOf(i)])),
          }}
          targetName={target?.name ?? ''}
          counts={counts}
        />
      )}
    </Modal>
  );
}

export default SourceTransferModal;
