import { useEffect, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, FolderInput, FolderOpen, FolderPlus, HardDrive, Layers, Search, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

import type { BrowserEngine, SourceType } from '../../types';
import { TONE_CLASS } from '../../constants/tone';
import { profileApi, type SourcePreview } from '../../services/profile-api.service';
import { CANCEL_BTN, CONFIRM_BTN, Field, InputField } from './FormBits';

export interface SourceDraft {
  name: string;
  type: SourceType;
  location: string;
  browsers: BrowserEngine[];
  description: string;
}

export interface ImportSourceDraft {
  name: string;
  location: string;
}

type SourceMode = 'create' | 'import';
type View = SourceMode | 'edit';
type StatusTone = 'idle' | 'checking' | 'ok' | 'error';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  existingLocations: string[];
  onCreate: (draft: SourceDraft) => void;
  onImport: (draft: ImportSourceDraft) => void;
  initial?: SourceDraft;
}

const SOFT_INPUT =
  'border-transparent bg-text-secondary/10 hover:bg-text-secondary/15 focus:border-transparent focus:bg-text-secondary/15';
const ERROR_INPUT = 'bg-error/10 hover:bg-error/15 focus:bg-error/15';
const DEFAULT_LOCATION = '/home/khanhromvn/.phantoma/profile'; // ASSUMED: đường dẫn mặc định theo yêu cầu

const normalize = (p: string): string => p.trim().replace(/[\\/]+$/, '');
const baseName = (p: string): string => normalize(p).split(/[\\/]/).pop() ?? '';

const MODES: { id: SourceMode; label: string; icon: typeof FolderPlus }[] = [
  { id: 'create', label: 'Create new', icon: FolderPlus },
  { id: 'import', label: 'Import existing', icon: FolderInput },
];

const VIEW_META: Record<View, { tag: string; tagClass: string; caption: string; storage: string; icon: typeof Layers }> = {
  create: {
    tag: 'New',
    tagClass: TONE_CLASS.success.pill,
    caption: 'Creates a fresh sub-folder named after the source inside the location you choose.',
    storage: 'New sub-folder',
    icon: Layers,
  },
  import: {
    tag: 'Import',
    tagClass: TONE_CLASS.warn.pill,
    caption: 'Uses the folder exactly as it is, picks up its Chrome profiles and rebuilds the backup.',
    storage: 'Existing folder',
    icon: FolderInput,
  },
  edit: {
    tag: 'Edit',
    tagClass: 'bg-text-secondary/10 text-text-secondary',
    caption: 'Rename this source or point it at a different folder.',
    storage: 'Existing folder',
    icon: Layers,
  },
};

const STATUS_CLASS: Record<StatusTone, string> = {
  idle: 'bg-text-secondary/10 text-text-secondary',
  checking: 'bg-text-secondary/10 text-text-secondary',
  ok: TONE_CLASS.success.pill,
  error: 'bg-error/10 text-error',
};

function PathCrumbs({ path, tail }: { path: string; tail?: string }) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  const shown = parts.length > 3 ? parts.slice(-3) : parts;
  if (shown.length === 0 && !tail) {
    return <span className="text-[11px] italic text-text-secondary">No folder selected</span>;
  }
  const chip = 'max-w-full truncate rounded-md px-1.5 py-0.5 font-mono text-[10px]';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="font-mono text-[10px] text-text-secondary">{parts.length > 3 ? '…' : '/'}</span>
      {shown.map((part, i) => (
        <span key={`${part}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-text-secondary" />}
          <span
            className={cn(
              chip,
              i === shown.length - 1 && !tail
                ? 'bg-text-secondary/20 text-text-primary'
                : 'bg-text-secondary/10 text-text-secondary',
            )}
          >
            {part}
          </span>
        </span>
      ))}
      {tail !== undefined && (
        <span className="flex min-w-0 items-center gap-1">
          {shown.length > 0 && <ChevronRight className="h-2.5 w-2.5 shrink-0 text-text-secondary" />}
          <span className={cn(chip, 'border border-dashed border-text-secondary/40 text-text-primary')}>{tail}</span>
        </span>
      )}
    </div>
  );
}

export function SourceModal({ isOpen, onClose, existingNames, existingLocations, onCreate, onImport, initial }: SourceModalProps) {
  const [mode, setMode] = useState<SourceMode>('create');
  const [name, setName] = useState(initial?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [createPath, setCreatePath] = useState(initial?.location ?? DEFAULT_LOCATION);
  const [importPath, setImportPath] = useState('');
  const [touched, setTouched] = useState(false);
  const [check, setCheck] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; reason?: string }>({ status: 'idle' });
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pQuery, setPQuery] = useState('');
  const [pFilter, setPFilter] = useState<'all' | 'new' | 'synced' | 'noemail'>('all');

  const importing = !initial && mode === 'import';
  const view: View = initial ? 'edit' : mode;
  const meta = VIEW_META[view];
  const location = importing ? importPath : createPath;
  const trimmed = name.trim();
  const path = importing ? normalize(location) : location.trim();
  const duplicatePath = importing && !!path && existingLocations.some((l) => normalize(l) === path);
  const nameError = !trimmed
    ? 'Name is required'
    : existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
      ? 'A source with this name already exists'
      : null;
  const showLocationError = check.status === 'invalid' || duplicatePath || (touched && !path);
  const locationError = !path
    ? importing
      ? 'Folder is required'
      : 'Location is required'
    : duplicatePath
      ? 'This folder is already a source'
      : (check.reason ?? 'Invalid folder');

  const status: { tone: StatusTone; label: string } = !path
    ? { tone: 'idle', label: 'Waiting for a folder' }
    : duplicatePath
      ? { tone: 'error', label: 'Already a source' }
      : check.status === 'invalid'
        ? { tone: 'error', label: check.reason ?? 'Invalid folder' }
        : check.status === 'valid'
          ? { tone: 'ok', label: 'Ready to go' }
          : { tone: 'checking', label: 'Checking folder…' };

  useEffect(() => {
    if (!path) {
      setCheck({ status: 'idle' });
      setPreview(null);
      return;
    }
    setCheck({ status: 'checking' });
    let cancelled = false;
    const timer = setTimeout(() => {
      const request: Promise<{ valid: boolean; reason?: string }> = importing
        ? profileApi.system.previewSource(path).then((r) => {
            if (!cancelled) setPreview(r);
            return r;
          })
        : profileApi.system.validateFolder(path);
      request
        .then((r) => {
          if (!cancelled) setCheck(r.valid ? { status: 'valid' } : { status: 'invalid', reason: r.reason });
        })
        .catch(() => {
          if (!cancelled) {
            setPreview(null);
            setCheck({ status: 'invalid', reason: 'Cannot access this folder' });
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, importing]);

  const changeLocation = (value: string): void => {
    if (importing) {
      setImportPath(value);
      if (!nameTouched) setName(baseName(value));
    } else {
      setCreatePath(value);
    }
  };

  const changeMode = (next: SourceMode): void => {
    setMode(next);
    setTouched(false);
    if (!nameTouched) setName(next === 'import' ? baseName(importPath) : '');
  };

  const browse = async (): Promise<void> => {
    const res = await window.api.invoke('dialog:select-paths', { kind: 'folder' });
    if (res?.success && res.paths?.[0]) changeLocation(res.paths[0]);
  };

  const submit = async (): Promise<void> => {
    setTouched(true);
    if (nameError || !path || duplicatePath) return;
    const result = await (importing ? profileApi.system.previewSource(path) : profileApi.system.validateFolder(path)).catch(() => ({
      valid: false,
      reason: 'Cannot access this folder',
    }));
    if (!result.valid) {
      setCheck({ status: 'invalid', reason: result.reason });
      return;
    }
    if (importing) {
      onImport({ name: trimmed, location: path });
      return;
    }
    onCreate({
      name: trimmed,
      type: initial?.type ?? 'local',
      location: path,
      browsers: initial?.browsers ?? ['chrome'],
      description: initial?.description ?? '',
    });
  };

  const nameField = (
    <Field label="Source name" error={touched ? nameError : null} hint={importing ? 'Defaults to the folder name' : undefined}>
      <InputField
        autoFocus={!importing}
        value={name}
        onChange={(e) => {
          setNameTouched(true);
          setName(e.target.value);
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Farm accounts 2026"
        className={cn(SOFT_INPUT, touched && nameError && ERROR_INPUT)}
      />
    </Field>
  );

  const locationField = (
    <Field
      label={importing ? 'Source folder' : 'Storage location'}
      error={showLocationError ? locationError : null}
      hint={importing ? 'Pick the folder that already holds your profiles' : 'The source folder is created inside this location'}
    >
      <div className="flex items-center gap-2">
        <InputField
          autoFocus={false}
          value={location}
          onChange={(e) => changeLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={importing ? '/path/to/existing/folder' : '/home/user/.phantoma/profile'}
          className={cn('min-w-0 flex-1 font-mono', SOFT_INPUT, showLocationError && 'border-dashed border-error bg-error/10 hover:bg-error/10 focus:border-error focus:bg-error/10')}
        />
        <button
          type="button"
          title="Browse folder"
          aria-label="Browse folder"
          onClick={browse}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      </div>
    </Field>
  );

  // ASSUMED: Electron preload may expose getPathForFile; fall back to legacy File.path
  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0] as (File & { path?: string }) | undefined;
    const bridge = window.api as unknown as { getPathForFile?: (f: File) => string };
    const dropped = file ? (bridge.getPathForFile?.(file) ?? file.path ?? '') : '';
    if (dropped) {
      setTouched(true);
      changeLocation(dropped);
    } else {
      setCheck({ status: 'invalid', reason: 'Cannot read the dropped folder path, use Browse instead' });
    }
  };

  const dropzone = (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={browse}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
        dragging
          ? 'border-primary bg-primary/10'
          : showLocationError
            ? 'border-error bg-error/10'
            : 'border-text-secondary/40 bg-text-secondary/5 hover:bg-text-secondary/10',
      )}
    >
      <FolderInput className={cn('h-6 w-6', dragging ? 'text-primary' : 'text-text-secondary')} />
      <span className="text-xs font-medium text-text-primary">
        {dragging ? 'Release to use this folder' : path ? baseName(path) : 'Drop a source folder here'}
      </span>
      <span className="text-[11px] text-text-secondary">or click to browse</span>
    </div>
  );

  const previewRows = preview?.profiles ?? [];
  const needle = pQuery.trim().toLowerCase();
  const previewShown = previewRows.filter((p) => {
    if (pFilter === 'new' && (p.synced || !p.hasEmail)) return false;
    if (pFilter === 'synced' && !p.synced) return false;
    if (pFilter === 'noemail' && p.hasEmail) return false;
    return (
      !needle ||
      p.folder.toLowerCase().includes(needle) ||
      (p.email ?? '').toLowerCase().includes(needle) ||
      p.name.toLowerCase().includes(needle)
    );
  });

  const previewTable =
    importing && preview?.valid ? (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-text-secondary">
          <span className="font-medium text-text-primary">Preview</span>
          <span>
            Showing {preview.profiles.length} of {preview.total} · {preview.withEmail} with email
          </span>
        </div>
        <div className="max-h-52 overflow-auto rounded-lg bg-text-secondary/10">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-card-background text-text-secondary">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Folder</th>
                <th className="px-2.5 py-1.5 font-medium">Email</th>
                <th className="px-2.5 py-1.5 font-medium">Sync</th>
              </tr>
            </thead>
            <tbody>
              {preview.profiles.map((p) => (
                <tr key={p.folder} className="border-t border-text-secondary/10">
                  <td className="px-2.5 py-1.5 font-mono text-text-primary">{p.folder}</td>
                  <td className="max-w-[160px] truncate px-2.5 py-1.5">
                    {p.email ? (
                      <span className="text-text-primary" title={p.name}>
                        {p.email}
                      </span>
                    ) : (
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.warn.pill)}>No email</span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                        p.synced ? TONE_CLASS.success.pill : 'bg-text-secondary/10 text-text-secondary',
                      )}
                    >
                      {p.synced ? 'Synced' : p.hasEmail ? 'New' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : null;

  const ViewIcon = meta.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={cn('transition-[max-width] duration-300', previewTable ? 'max-w-5xl' : 'max-w-3xl')}
    >
      <ModalHeader
        title={initial ? 'Edit source' : importing ? 'Import source' : 'New source'}
        description="A source is a local folder where a set of profiles is stored"
        onClose={onClose}
      />
      <ModalBody className="py-4">
        <div className="grid gap-4 md:grid-cols-[250px_minmax(0,1fr)]">
          <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-card-background p-4">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 text-text-primary opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full blur-2xl"
              style={{ background: 'hsl(265 80% 60% / 0.35)' }}
              animate={{ x: [0, 18, 0], y: [0, 12, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -right-10 h-40 w-40 rounded-full blur-2xl"
              style={{ background: 'hsl(150 70% 45% / 0.22)' }}
              animate={{ x: [0, -16, 0], y: [0, -10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative flex items-start justify-between">
              <AnimatePresence mode="wait">
                <motion.span
                  key={view}
                  initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className={cn('flex h-12 w-12 items-center justify-center rounded-xl', TONE_CLASS.primary.icon)}
                >
                  <ViewIcon className="h-6 w-6" />
                </motion.span>
              </AnimatePresence>
              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', meta.tagClass)}>
                {meta.tag}
              </span>
            </div>

            <div className="relative flex min-w-0 flex-col gap-2">
              <span className={cn('truncate text-base font-semibold', trimmed ? 'text-text-primary' : 'text-text-secondary')}>
                {trimmed || 'Untitled source'}
              </span>
              <PathCrumbs path={path} tail={view === 'create' ? (trimmed ? trimmed.replace(/[\\/]/g, '-') : 'name') : undefined} />
            </div>

            <div className="relative flex flex-col gap-2 rounded-lg bg-background/60 p-2.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-text-secondary">
                  <HardDrive className="h-3 w-3" />
                  Type
                </span>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.success.pill)}>Local</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-secondary">Browser</span>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', TONE_CLASS.warn.pill)}>Google Chrome</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-secondary">Storage</span>
                <span className="font-medium text-text-primary">{meta.storage}</span>
              </div>
            </div>

            <span
              className={cn(
                'relative flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[11px] font-medium',
                STATUS_CLASS[status.tone],
              )}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-current', status.tone === 'checking' && 'animate-pulse')} />
              <span className="truncate">{status.label}</span>
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            {!initial && (
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => changeMode(m.id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg p-2.5 text-left transition-colors',
                        active ? 'bg-primary/10' : 'bg-text-secondary/10 hover:bg-text-secondary/15',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                          active ? 'bg-primary/15 text-primary' : 'bg-text-secondary/10 text-text-secondary',
                        )}
                      >
                        <m.icon className="h-4 w-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn('truncate text-xs font-semibold', active ? 'text-primary' : 'text-text-primary')}>{m.label}</span>
                        <span className="truncate text-[11px] text-text-secondary">
                          {m.id === 'create' ? 'Start with an empty folder' : 'Use a folder you already have'}
                        </span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={view}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
                className="text-xs leading-relaxed text-text-secondary"
              >
                {meta.caption}
              </motion.p>
            </AnimatePresence>

            {importing ? (
              <>
                {dropzone}
                {locationField}
                {previewTable}
                {nameField}
              </>
            ) : (
              <>
                {nameField}
                {locationField}
              </>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} className={CANCEL_BTN}>
          Cancel
        </Button>
        <Button onClick={submit} className={CONFIRM_BTN}>
          {initial ? 'Save changes' : importing ? 'Import source' : 'Create source'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default SourceModal;