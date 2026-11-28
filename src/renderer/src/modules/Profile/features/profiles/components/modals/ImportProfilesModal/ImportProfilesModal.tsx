import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { HardDrive, Info, Loader2, Search, Upload, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { profileApi } from '../../../../../shared/api/profile.api';
import type { ImportBackupRow, ImportFolderRow } from '../../../../../shared/types';
import { Pill } from '../../../../../shared/components/Pill';
import { SyncBadge } from '../../../../../shared/components/SyncBadge';
import { CANCEL_BTN, CONFIRM_BTN, InputField } from '../../../../../shared/components/FormBits';
import { ImportProgressModal } from './ImportProgressModal';
import { ImportProfilesModalProps, Method, RawRow, RowFilter } from './import-profiles.types';
import { FILTERS, METHODS, STATUS_LABEL, STATUS_TONE } from './import-profiles.constants';
import { annotate, backupRaws, baseName, folderRaws, parseTable } from '../../../utils/import-parser.util';
import { FolderCell } from './ImportFolderCell';

export function ImportProfilesModal({ isOpen, onClose, sources, defaultSourceId, existingEmails, onImport, onImported }: ImportProfilesModalProps) {
  const [method, setMethod] = useState<Method>('folder');
  const [folder, setFolder] = useState<{ path: string; container: boolean; rows: ImportFolderRow[] } | null>(null);
  const [file, setFile] = useState<{ name: string; text: string; backup: ImportBackupRow[] | null } | null>(null);

  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<RowFilter>('all');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(false);

  const source = sources.find((s) => s.id === defaultSourceId) ?? null;
  const active = METHODS.find((m) => m.id === method) ?? METHODS[0];
  const ActiveIcon = active.icon;
  const showFolder = method === 'folder';

  const raws = useMemo<RawRow[]>(() => {
    if (method === 'folder') return folder ? folderRaws(folder.rows) : [];
    if (!file) return [];
    return file.backup ? backupRaws(file.backup) : parseTable(file.text);
  }, [method, folder, file]);

  const rows = useMemo(() => annotate(raws, existingEmails), [raws, existingEmails]);
  const signature = rows.map((r) => `${r.key}:${r.status}`).join('|');

  useEffect(() => {
    setPicked(new Set(rows.filter((r) => r.status === 'new').map((r) => r.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const stats = {
    fresh: rows.filter((r) => r.status === 'new').length,
    dup: rows.filter((r) => r.status === 'duplicate').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
    unsynced: rows.filter((r) => r.status !== 'invalid' && r.sync && r.sync !== 'synced').length,
    renamed: rows.filter((r) => r.nextFolder && r.nextFolder !== r.folder).length,
  };

  const needle = query.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === 'new' && r.status !== 'new') return false;
    if (filter === 'duplicate' && r.status !== 'duplicate') return false;
    if (filter === 'invalid' && r.status !== 'invalid') return false;
    if (filter === 'unsynced' && (r.status === 'invalid' || !r.sync || r.sync === 'synced')) return false;
    if (!needle) return true;
    return [r.draft.email, r.folder ?? '', r.nextFolder ?? '', r.reason ?? '', STATUS_LABEL[r.status]].some((v) =>
      v.toLowerCase().includes(needle),
    );
  });

  const selectable = visible.filter((r) => r.status === 'new');
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.key));
  const ready = rows.filter((r) => r.status === 'new' && picked.has(r.key));
  const canImport = ready.length > 0 && !!source;

  const toggleAll = (value: boolean): void =>
    setPicked((prev) => {
      const next = new Set(prev);
      selectable.forEach((r) => (value ? next.add(r.key) : next.delete(r.key)));
      return next;
    });

  const toggleOne = (key: string, value: boolean): void =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });

  const browse = async (kind: 'folder' | 'file'): Promise<void> => {
    const options =
      kind === 'folder'
        ? { kind }
        : { kind, filters: [{ name: 'Import files', extensions: ['csv', 'tsv', 'txt', 'sql', 'db', 'sqlite'] }] };
    const res = await window.api.invoke('dialog:select-paths', options);
    const chosen: string | undefined = res?.success ? res.paths?.[0] : undefined;
    if (chosen) await load(kind, chosen);
  };

  const load = async (kind: 'folder' | 'file', chosen: string): Promise<void> => {
    setReadError(null);
    setLoading(true);
    try {
      if (kind === 'folder') {
        const result = await profileApi.system.previewImportFolder(chosen);
        if (!result.valid) {
          setReadError(result.reason ?? 'Cannot read this folder');
          return;
        }
        setFolder({ path: chosen, container: result.container, rows: result.rows });
      } else {
        const result = await profileApi.system.readImportFile(chosen);
        setFile(
          result.kind === 'text'
            ? { name: baseName(chosen), text: result.text, backup: null }
            : { name: baseName(chosen), text: '', backup: result.rows },
        );
      }
    } catch (err) {
      setReadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // ASSUMED: Electron preload may expose getPathForFile; fall back to legacy File.path (same as SourceModal)
  const onDrop = (e: DragEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const dropped = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined;
    const bridge = window.api as unknown as { getPathForFile?: (f: File) => string };
    const dropPath = dropped ? (bridge.getPathForFile?.(dropped) ?? dropped.path ?? '') : '';
    if (dropPath) void load(method, dropPath);
    else setReadError('Cannot read the dropped path, click to browse instead');
  };

  const submit = (): void => {
    if (!canImport || !source) return;
    if (method === 'folder' && folder) {
      setProgress(true);
      return;
    }
    onImport({ rows: ready.map((r) => r.draft), target: { kind: 'existing', sourceId: source.id } });
  };

  const dropTitle =
    method === 'folder' && folder
      ? `${baseName(folder.path)} - ${folder.rows.length} ${folder.container ? 'profile folders' : 'profile folder'}`
      : method === 'file' && file
        ? file.name
        : active.dropTitle;
  const dropHint =
    method === 'folder' && folder
      ? `${folder.path} - click to choose another`
      : method === 'file' && file
        ? `${file.backup ? 'Source backup' : 'Text table'} - click to choose another`
        : active.dropHint;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-3xl'>
      <div className='flex shrink-0 items-center gap-3 border-b border-border px-5 py-3'>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASS.primary.icon)}>
          <Upload className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <h3 className='flex flex-wrap items-center gap-2 text-base font-bold text-text-primary'>
            Import profiles for
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold',
                TONE_CLASS.primary.pill,
              )}
            >
              <HardDrive className='h-3 w-3' />
              {source?.name ?? 'Unknown source'}
            </span>
          </h3>
          <p className='mt-0.5 truncate text-xs text-text-secondary'>Bring existing accounts into this source</p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='shrink-0 cursor-pointer rounded-md bg-card-background p-1.5 text-text-secondary transition-colors hover:bg-error/15 hover:text-error'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
      <ModalBody className='flex flex-col gap-3 py-4'>
        <div className='grid grid-cols-2 gap-2'>
          {METHODS.map((m) => (
            <button
              key={m.id}
              type='button'
              onClick={() => {
                setMethod(m.id);
                setReadError(null);
                setFilter('all');
                setQuery('');
              }}
              className={cn(
                'flex items-start gap-3 rounded-lg p-3 text-left transition-colors',
                method === m.id ? m.card : 'bg-text-secondary/10 hover:bg-text-secondary/15',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  method === m.id ? TONE_CLASS[m.tone].icon : 'bg-text-secondary/10 text-text-secondary',
                )}
              >
                <m.icon className='h-4 w-4' />
              </span>
              <span className='flex min-w-0 flex-col gap-0.5'>
                <span className={cn('text-xs font-semibold', method === m.id ? 'text-text-primary' : 'text-text-secondary')}>
                  {m.label}
                </span>
                <span className='text-[11px] leading-snug text-text-secondary'>{m.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <button
            type='button'
            disabled={loading}
            onClick={() => void browse(method === 'folder' ? 'folder' : 'file')}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors disabled:cursor-wait disabled:opacity-60',
              dragging ? 'border-primary bg-primary/10' : 'border-border hover:bg-text-secondary/5',
            )}
          >
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', TONE_CLASS[active.tone].icon)}>
              {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : <ActiveIcon className='h-5 w-5' />}
            </span>
            <span className='flex max-w-full flex-col items-center gap-1'>
              <span className='max-w-full truncate text-sm font-semibold text-text-primary'>{dropTitle}</span>
              <span className='max-w-full truncate text-xs text-text-secondary'>{dropHint}</span>
            </span>
        </button>
        {readError && <span className='text-[11px] text-error'>{readError}</span>}

        <div className='flex items-center justify-center gap-2.5 rounded-lg bg-card-background px-3 py-2.5 text-center text-[11px] leading-snug text-text-secondary'>
          <span
            className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', TONE_CLASS[active.tone].icon)}
          >
            <Info className='h-3.5 w-3.5' />
          </span>
          <span>{active.info}</span>
        </div>

        {rows.length > 0 && (
          <>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <Pill tone='success'>{stats.fresh} new</Pill>
                <Pill tone='warn'>{stats.dup} duplicate</Pill>
                {stats.unsynced > 0 && <Pill tone='info'>{stats.unsynced} unsynced</Pill>}
                {stats.renamed > 0 && (
                  <Pill tone='primary'>
                    {stats.renamed} folder{stats.renamed > 1 ? 's' : ''} renamed
                  </Pill>
                )}
                {stats.invalid > 0 && <Pill tone='error'>{stats.invalid} invalid</Pill>}
              </div>
              <div className='flex gap-1 rounded-md bg-text-secondary/10 p-0.5'>
                {FILTERS.filter((f) => showFolder || f.id !== 'unsynced').map((f) => (
                  <button
                    key={f.id}
                    type='button'
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                      filter === f.id
                        ? 'bg-text-secondary/15 text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className='relative'>
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

            <div className='max-h-72 overflow-auto rounded-lg bg-card-background'>
              <table className='w-full text-left text-xs'>
                <thead className='sticky top-0 z-10 bg-card-background text-[11px] text-text-secondary'>
                  <tr>
                    <th className='w-9 px-3 py-2'>
                      <Checkbox size='sm' checked={allPicked} disabled={selectable.length === 0} onChange={toggleAll} />
                    </th>
                    <th className='w-12 py-2 font-medium'>STT</th>
                    <th className='py-2 pr-3 font-medium'>Email</th>
                    {showFolder && <th className='py-2 pr-3 font-medium'>Folder name</th>}
                    {showFolder && <th className='w-24 py-2 pr-3 font-medium'>Sync</th>}
                    <th className='w-32 py-2 pr-3 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const on = picked.has(r.key) && r.status === 'new';
                    return (
                      <tr key={r.key} className={cn('transition-colors hover:bg-text-secondary/5', !on && 'opacity-60')}>
                        <td className='px-3 py-1.5 align-top'>
                          <Checkbox
                            size='sm'
                            checked={on}
                            disabled={r.status !== 'new'}
                            onChange={(v) => toggleOne(r.key, v)}
                          />
                        </td>
                        <td className='py-1.5 align-top text-text-secondary'>{rows.indexOf(r) + 1}</td>
                        <td className='max-w-[240px] py-1.5 pr-3 align-top'>
                          <div className='truncate text-text-primary' title={r.draft.email}>
                            {r.draft.email || '-'}
                          </div>
                          {(r.reason ?? r.detail) && (
                            <div
                              className={cn('truncate text-[11px]', r.reason ? 'text-warn' : 'text-text-secondary')}
                              title={r.reason ?? r.detail}
                            >
                              {r.reason ?? r.detail}
                            </div>
                          )}
                        </td>
                        {showFolder && (
                          <td className='max-w-[240px] py-1.5 pr-3 align-top'>
                            <FolderCell row={r} />
                          </td>
                        )}
                        {showFolder && (
                          <td className='py-1.5 pr-3 align-top'>
                            <SyncBadge state={r.sync ?? 'unsynced'} />
                          </td>
                        )}
                        <td className='py-1.5 pr-3 align-top'>
                          <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={showFolder ? 6 : 4} className='px-3 py-6 text-center text-text-secondary'>
                        No rows match
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <span className='mr-auto text-xs text-text-secondary'>
          {rows.length > 0 ? `${ready.length} of ${rows.length} selected` : ''}
        </span>
        <Button onClick={onClose} className={CANCEL_BTN}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!canImport} className={CONFIRM_BTN}>
          {ready.length > 0 ? `Import ${ready.length} ${ready.length === 1 ? 'profile' : 'profiles'}` : 'Import'}
        </Button>
      </ModalFooter>
      {progress && folder && source && (
        <ImportProgressModal
          isOpen
          path={folder.path}
          targetId={source.id}
          targetName={source.name}
          folders={ready.map((r) => r.folder).filter((f): f is string => !!f)}
          onFinished={() => {
            setProgress(false);
            onImported();
          }}
        />
      )}
    </Modal>
  );
}

export default ImportProfilesModal;