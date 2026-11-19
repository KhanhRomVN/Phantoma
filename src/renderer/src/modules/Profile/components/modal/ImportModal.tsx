import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowRight, FileSpreadsheet, FolderOpen, HardDrive, Info, Loader2, Search, Upload, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Checkbox } from '@renderer/components/ui/Checkbox';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

import type { ProfileSource, SyncState } from '../../types';
import type { Tone } from '../../types/ui.types';
import { TONE_CLASS } from '../../constants/tone';
import { profileApi } from '../../services/profile-api.service';
import type { ImportBackupRow, ImportFolderRow } from '../../services/profile-api.service';
import { Pill, SyncBadge } from '../common/StatusBadge';
import { CANCEL_BTN, CONFIRM_BTN, EMAIL_RE, InputField, estimateStrength, splitCodes } from './FormBits';
import type { ProfileDraft } from './CreateProfileModal';
import { ImportProgressModal } from './ImportProgressModal';

export type ImportRowDraft = Omit<ProfileDraft, 'sourceId'>;
export type ImportTarget = { kind: 'existing'; sourceId: string } | { kind: 'new'; name: string };
export interface ImportResult {
  rows: ImportRowDraft[];
  target: ImportTarget;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ProfileSource[];
  defaultSourceId: string;
  existingEmails: string[];
  onImport: (result: ImportResult) => void;
  onImported: () => void;
}

type Method = 'folder' | 'file';
type RowStatus = 'new' | 'duplicate' | 'invalid';
type RowFilter = 'all' | 'new' | 'duplicate' | 'unsynced' | 'invalid';
type Column =
  | 'email'
  | 'password'
  | 'recoveryEmail'
  | 'phone'
  | 'totpSecret'
  | 'backupCodes'
  | 'displayName'
  | 'group';

interface RawRow {
  key: string;
  draft: ImportRowDraft;
  folder?: string;
  sync?: SyncState;
  detail?: string;
  invalid?: string | null;
}

interface PreviewRow extends RawRow {
  status: RowStatus;
  reason: string | null;
  nextFolder: string | null;
}

const COLUMN_ORDER: Column[] = ['email', 'password', 'recoveryEmail', 'phone', 'totpSecret', 'backupCodes'];

const ALIASES: Record<Column, string[]> = {
  email: ['email', 'mail', 'gmail', 'account', 'username', 'user', 'login'],
  password: ['password', 'pass', 'pwd'],
  recoveryEmail: ['recovery', 'recoveryemail', 'recoverymail', 'backupemail'],
  phone: ['phone', 'phonenumber', 'mobile', 'tel'],
  totpSecret: ['totp', 'totpsecret', '2fa', 'otp', 'secret', 'authenticator'],
  backupCodes: ['backupcodes', 'backupcode', 'backup', 'codes'],
  displayName: ['name', 'displayname', 'fullname'],
  group: ['group', 'category'],
};

interface MethodMeta {
  id: Method;
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint: string;
  card: string;
  dropTitle: string;
  dropHint: string;
  info: string;
}

const METHODS: MethodMeta[] = [
  {
    id: 'folder',
    icon: FolderOpen,
    tone: 'primary',
    label: 'Folder',
    hint: 'A folder of profile folders, or one profile folder',
    card: 'bg-primary/10',
    dropTitle: 'Choose a folder',
    dropHint: 'Emails, folder names and Chrome sync state are read automatically',
    info: 'Accepts a folder that contains profile folders, or a profile folder itself. Folders not named after the email are renamed to the email.',
  },
  {
    id: 'file',
    icon: FileSpreadsheet,
    tone: 'info',
    label: 'File',
    hint: 'CSV / TSV, or a source backup with emails and service_emails',
    card: 'bg-info/10',
    dropTitle: 'Choose a file',
    dropHint: '.csv, .tsv, .txt, .sql, .db or .sqlite',
    info: 'CSV columns: email, password, recovery_email, phone, totp, backup_codes (header optional). A backup .sql file is scanned for its emails and service_emails tables.',
  },
];

const FILTERS: { id: RowFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'unsynced', label: 'Unsynced' },
  { id: 'invalid', label: 'Invalid' },
];

const STATUS_TONE: Record<RowStatus, Tone> = { new: 'success', duplicate: 'warn', invalid: 'error' };
const STATUS_LABEL: Record<RowStatus, string> = { new: 'New', duplicate: 'Duplicate', invalid: 'Invalid' };


const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const baseName = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

function detectDelimiter(line: string): string {
  const candidates = [',', ';', '\t', '|'];
  return candidates
    .map((d) => ({ d, n: line.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function buildDraft(get: (c: Column) => string): ImportRowDraft {
  const email = get('email');
  const password = get('password');
  return {
    email,
    displayName: get('displayName') || email.split('@')[0],
    password,
    passwordStrength: estimateStrength(password),
    recoveryEmail: get('recoveryEmail'),
    phone: get('phone'),
    totpSecret: get('totpSecret').replace(/\s+/g, '').toUpperCase(),
    backupCodes: splitCodes(get('backupCodes')),
    group: get('group') || 'Imported',
    purpose: 'Imported',
    notes: '',
  };
}

function parseTable(text: string): RawRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length === 0) return [];
  const delim = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delim);
  const headerless = first[0].includes('@');
  const map: (Column | null)[] = headerless
    ? COLUMN_ORDER
    : first.map((h) => {
        const n = normalize(h);
        return (Object.keys(ALIASES) as Column[]).find((c) => ALIASES[c].includes(n)) ?? null;
      });
  const body = headerless ? lines : lines.slice(1);
  return body.map((line, i) => {
    const cells = splitLine(line, delim);
    const draft = buildDraft((c) => {
      const idx = map.indexOf(c);
      return idx >= 0 ? (cells[idx] ?? '') : '';
    });
    return { key: `row-${i}`, draft, detail: draft.totpSecret ? '2FA' : 'No 2FA' };
  });
}

function folderRaws(items: ImportFolderRow[]): RawRow[] {
  return items.map((r, i) => ({
    key: `dir-${i}`,
    draft: buildDraft((c) => (c === 'email' ? (r.email ?? '') : '')),
    folder: r.folder,
    sync: r.sync,
    invalid: r.email ? null : 'No email found',
  }));
}

function backupRaws(items: ImportBackupRow[]): RawRow[] {
  return items.map((r, i) => {
    const values: Partial<Record<Column, string>> = {
      email: r.email,
      displayName: r.displayName ?? '',
      recoveryEmail: r.recoveryEmail ?? '',
      phone: r.phone ?? '',
      totpSecret: r.totp ?? '',
      backupCodes: r.backupCodes.join(' '),
    };
    return {
      key: `bk-${i}`,
      draft: buildDraft((c) => values[c] ?? ''),
      detail: `${r.services} service${r.services === 1 ? '' : 's'}${r.totp ? ' - 2FA' : ''}`,
    };
  });
}

function annotate(raws: RawRow[], existing: string[]): PreviewRow[] {
  const existingSet = new Set(existing.map((e) => e.toLowerCase()));
  const seen = new Set<string>();
  return raws.map((r) => {
    const email = r.draft.email.trim();
    const key = email.toLowerCase();
    let status: RowStatus = 'new';
    let reason: string | null = null;
    if (r.invalid) {
      status = 'invalid';
      reason = r.invalid;
    } else if (!EMAIL_RE.test(email)) {
      status = 'invalid';
      reason = 'Invalid email';
    } else if (existingSet.has(key)) {
      status = 'duplicate';
      reason = 'Already exists';
    } else if (seen.has(key)) {
      status = 'duplicate';
      reason = 'Repeated in this list';
    } else {
      seen.add(key);
    }
    const nextFolder = status !== 'invalid' && r.folder !== undefined ? key : null;
    return { ...r, status, reason, nextFolder };
  });
}

function FolderCell({ row }: { row: PreviewRow }) {
  const old = row.folder ?? '-';
  if (!row.nextFolder || row.nextFolder === old) {
    return <span className='block truncate font-mono text-[11px] text-text-secondary'>{old}</span>;
  }
  return (
    <span className='flex items-center gap-1.5 font-mono text-[11px]' title={`${old} -> ${row.nextFolder}`}>
      <span className='truncate text-text-secondary line-through'>{old}</span>
      <ArrowRight className='h-3 w-3 shrink-0 text-text-secondary' />
      <span className='truncate text-text-primary'>{row.nextFolder}</span>
    </span>
  );
}

export function ImportModal({ isOpen, onClose, sources, defaultSourceId, existingEmails, onImport, onImported }: ImportModalProps) {
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

export default ImportModal;