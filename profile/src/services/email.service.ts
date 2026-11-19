import fs from 'fs';
import path from 'path';
import { emailCache } from '../cache/email.cache';
import { serviceEmailCache } from '../cache/service_email.cache';
import { getDb } from '../database/connection';
import { requireFields, type Input } from '../database/sql';
import { emailRepository } from '../repositories/email.repository';
import {
  browsingEntryRepository,
  deviceActivityRepository,
  footprintRepository,
  scriptRunRepository,
  sourceRepository,
} from '../repositories/service.repository';
import { serviceEmailRepository } from '../repositories/service_email.repository';
import { sessionRepository } from '../repositories/session.repository';
import {
  provisionProfileFolder,
  readRecentHistory,
  removeProfileFolder,
} from '../utils/browser-folder';
import {
  activeChromeFolders,
  folderNameFor,
  isChromeRoot,
  nextChromeProfileName,
  pickFreeFolder,
  readSyncState,
  TransferCancelled,
  measureFolder,
  toEmailId,
  transferProfileFolder,
} from '../utils/browser-folder';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';
import { createLogger } from '../utils/logger';
import { openPath } from '../utils/system';
import { dropEmailBackup, syncEmailBackup } from './backup.service';
import { serviceEmailService } from './service_email.service';

const log = createLogger('email');

type Email = NonNullable<ReturnType<typeof emailRepository.getById>>;

export interface BulkUpdateInput {
  ids?: string[];
  where?: { group: string };
  patch: Record<string, unknown>;
}

export type ConflictLevel = 'identical' | 'mergeable' | 'conflict';

export interface TransferInput {
  ids: string[];
  targetId: string;
  mode: 'move' | 'duplicate';
  policy: string;
  policies?: Record<string, string>;
}

export interface TransferOutcome {
  transferred: number;
  merged: number;
  skipped: number;
  cancelled: boolean;
  failed: { id: string; email: string; error: string }[];
}

export interface TransferRun {
  isCancelled: () => boolean;
  onPlan?: (items: { id: string; email: string; bytes: number }[]) => void;
  onItemStart?: (id: string) => void;
  onBytes?: (n: number) => void;
  onItemDone?: (id: string, state: 'transferred' | 'merged' | 'skipped' | 'failed', error?: string) => void;
}

export interface TransferPlanItem {
  id: string;
  email: string;
  oldFolder: string;
  newFolder: string;
  folderRule: 'email' | 'chrome';
  blocked: string | null;
  conflict: {
    targetId: string;
    targetFolder: string;
    level: ConflictLevel;
    fillable: string[];
    differing: string[];
  } | null;
}

function requireEmail(emailId: string): void {
  if (!emailRepository.exists(emailId)) throw new AppError('email not found', 404);
}

// ─── email children (footprints, scripts, devices, browsing entries) ──

interface ChildRepository<T> {
  list: (emailId: string) => T[];
  get: (id: string) => T | null;
  create: (emailId: string, input: Input) => T | null;
  update: (id: string, input: Input) => T | null;
  remove: (id: string) => boolean;
}

function makeChildService<T>(label: string, repo: ChildRepository<T>) {
  return {
    list: async (emailId: string): Promise<T[]> => {
      requireEmail(emailId);
      return repo.list(emailId);
    },
    get: async (id: string): Promise<T> => found(repo.get(id), label),
    create: async (emailId: string, input: Input): Promise<T | null> => {
      requireEmail(emailId);
      return repo.create(emailId, input);
    },
    update: async (id: string, input: Input): Promise<T> => found(repo.update(id, input), label),
    remove: async (id: string): Promise<void> => {
      if (!repo.remove(id)) throw new AppError(`${label} not found`, 404);
    },
  };
}

export const footprintService = makeChildService('footprint', footprintRepository);
export const scriptRunService = makeChildService('script run', scriptRunRepository);
export const deviceActivityService = makeChildService('device activity', deviceActivityRepository);

export const browsingEntryService = {
  ...makeChildService('browsing entry', browsingEntryRepository),
  listInRange: async (emailId: string, from?: number, to?: number) =>
    browsingEntryRepository.listInRange(emailId, from, to),
  clear: async (emailId: string): Promise<number> => browsingEntryRepository.clear(emailId),
};

// ─── emails ─────────────────────────────────────────────────────────────

async function dropCaches(): Promise<void> {
  await Promise.all([emailCache.invalidate(), serviceEmailCache.invalidate()]);
}

async function browsingOf(emailId: string) {
  let stored: ReturnType<typeof readRecentHistory> = [];
  try {
    stored = browsingEntryRepository.list(emailId) as unknown as ReturnType<typeof readRecentHistory>;
  } catch (err) {
    log.warn(`browsing table unavailable for ${emailId}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const seen = new Set(stored.map((b) => b.url));
  const recent = readRecentHistory(emailId);
  log.info(`history ${emailId}: stored=${stored.length} browser=${recent.length}`);
  const fromBrowser = recent.filter((b) => !seen.has(b.url));
  const merged = [...stored, ...fromBrowser].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // ASSUMED: Chrome history has no footprint, so a visit belongs to the session whose [startedAt, endedAt] contains its last visit time; visits outside any session (browser opened outside the app) keep an empty footprintId
  let sessions: ReturnType<typeof sessionRepository.list> = [];
  try {
    sessions = sessionRepository.list(emailId);
  } catch (err) {
    log.warn(`cannot read sessions of ${emailId}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const spans = sessions.map((s) => ({
    id: s.id,
    from: Date.parse(s.startedAt),
    to: s.endedAt ? Date.parse(s.endedAt) + 60_000 : Date.now() + 60_000,
  }));
  return merged.map((b) => {
    if (b.footprintId) return b;
    const t = Date.parse(b.at);
    const span = spans.find((s) => t >= s.from && t <= s.to);
    return span ? { ...b, footprintId: span.id } : b;
  });
}

const BROWSING_TTL_MS = 30_000;
const browsingCache = new Map<string, { at: number; data: Awaited<ReturnType<typeof browsingOf>> }>();

async function cachedBrowsing(emailId: string) {
  const hit = browsingCache.get(emailId);
  if (hit && Date.now() - hit.at < BROWSING_TTL_MS) return hit.data;
  let data: Awaited<ReturnType<typeof browsingOf>> = [];
  try {
    data = await browsingOf(emailId);
  } catch (err) {
    log.warn(`cannot read browser history of ${emailId}: ${err instanceof Error ? err.message : String(err)}`);
  }
  browsingCache.set(emailId, { at: Date.now(), data });
  return data;
}

async function withRelations(p: Email) {
  const services = await serviceEmailService.list(p.id);
  const browsing = await cachedBrowsing(p.id);
  // ASSUMED: footprints/scripts/devices tables were dropped in schema v6, so the renderer gets empty lists; browsing comes from the browser's own History DB
  return { ...p, services, footprints: [], browsing, scripts: [], devices: [] };
}

const withSync = <T extends { id: string }>(p: T) => ({ ...p, chromeSync: readSyncState(p.id) });

async function list(sourceId?: string, full = false) {
  const base = (await emailCache.list(sourceId, () => emailRepository.list(sourceId))).map(withSync);
  if (!full) return base;
  return Promise.all(base.map(withRelations));
}

async function find(id: string, full = false) {
  const cached = await emailCache.get(id, () => emailRepository.getById(id));
  if (!cached) return null;
  const base = withSync(cached);
  return full ? withRelations(base) : base;
}

async function get(id: string, full = false) {
  return found(await find(id, full), 'email');
}

function createSync(input: Input): string {
  requireFields(input, ['sourceId', 'email']);
  const source = sourceRepository.getById(String(input.sourceId));
  if (!source) throw new AppError('source not found', 404);
  const folder =
    provisionProfileFolder(source.location, String(input.email), input.chromeProfile) ??
    String(input.chromeProfile ?? '');
  return emailRepository.create({ ...input, chromeProfile: folder });
}

function removeSync(id: string): boolean {
  const row = emailRepository.getRaw(id);
  if (!row) return false;

  dropEmailBackup(id);
  emailRepository.remove(id);
  serviceEmailRepository.purge(id);
  sessionRepository.purge(id);
  return true;
}

async function create(input: Input) {
  const id = createSync(input);
  syncEmailBackup(id);
  await dropCaches();
  return get(id, true);
}

async function createMany(inputs: Input[]) {
  const run = getDb().transaction((items: Input[]) => items.map((i) => createSync(i)));
  const ids = run(inputs);
  ids.forEach((id) => syncEmailBackup(id));
  await dropCaches();
  return Promise.all(ids.map((id) => get(id, true)));
}

async function update(id: string, input: Input) {
  const ok = emailRepository.update(id, input);
  if (ok) syncEmailBackup(id);
  await emailCache.invalidate();
  if (!ok) throw new AppError('email not found', 404);
  return get(id);
}

async function remove(id: string): Promise<boolean> {
  const removed = removeSync(id);
  if (removed) await dropCaches();
  return removed;
}

async function removeMany(ids: string[]): Promise<number> {
  let deleted = 0;
  const failures: string[] = [];
  for (const id of ids) {
    try {
      if (removeSync(id)) deleted++;
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  await dropCaches();
  if (failures.length > 0) {
    throw new AppError(`Deleted ${deleted}, failed ${failures.length}: ${failures[0]}`, 500);
  }
  return deleted;
}

async function openFolder(id: string): Promise<{ path: string }> {
  const email = await get(id);
  const location = sourceRepository.getById(email.sourceId)?.location;
  if (!location) throw new AppError('source has no location', 400);
  const profileDir = email.chromeProfile ? path.join(location, email.chromeProfile) : location;
  const target = fs.existsSync(profileDir) ? profileDir : location;
  if (!fs.existsSync(target)) throw new AppError('folder does not exist', 404);
  if (!(await openPath(target))) throw new AppError('cannot open folder', 500);
  return { path: target };
}

// ─── bulk update / transfer ─────────────────────────────────────────────

async function bulkUpdate({ ids, where, patch }: BulkUpdateInput): Promise<number> {
  const targets = ids ?? (await list()).filter((p) => p.group === where?.group).map((p) => p.id);
  const run = getDb().transaction((items: string[]) => {
    items.forEach((id) => emailRepository.update(id, patch));
    return items.length;
  });
  const updated = run(targets);
  targets.forEach((id) => syncEmailBackup(id));
  await emailCache.invalidate();
  return updated;
}

const COMPARE_FIELDS: { key: string; get: (p: Email) => string }[] = [
  { key: 'recoveryEmail', get: (p) => p.recoveryEmail ?? '' },
  { key: 'phone', get: (p) => p.phone ?? '' },
  { key: 'totpSecret', get: (p) => p.totpSecret ?? '' },
  { key: 'backupCodes', get: (p) => p.backupCodes.map((c) => c.code).sort().join(',') },
  { key: 'avatarUrl', get: (p) => p.avatarUrl ?? '' },
];

function compareEmails(target: Email, from: Email) {
  const fillable: string[] = [];
  const differing: string[] = [];
  for (const f of COMPARE_FIELDS) {
    const a = f.get(target);
    const b = f.get(from);
    if (!b || a === b) continue;
    (a ? differing : fillable).push(f.key);
  }
  const level: ConflictLevel =
    differing.length > 0 ? 'conflict' : fillable.length > 0 ? 'mergeable' : 'identical';
  return { level, fillable, differing };
}

function mergePatch(target: Email, from: Email, overwrite: boolean): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of COMPARE_FIELDS) {
    const a = f.get(target);
    const b = f.get(from);
    if (!b || a === b || (a && !overwrite)) continue;
    patch[f.key] = from[f.key as keyof Email];
  }
  return patch;
}

function rekeyEmail(oldId: string, newId: string): void {
  try {
    getDb().prepare('UPDATE browsing_entries SET email_id = ? WHERE email_id = ?').run(newId, oldId);
  } catch (err) {
    log.warn(`cannot rekey browsing entries ${oldId} -> ${newId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function planTransfer(ids: string[], targetId: string): Promise<TransferPlanItem[]> {
  const target = sourceRepository.getById(targetId);
  if (!target) throw new AppError('source not found', 404);
  const all = await list();
  const byId = new Map(all.map((p) => [p.id, p] as const));
  const picked = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.sourceId !== targetId);
  const targetByEmail = new Map(
    all.filter((p) => p.sourceId === targetId).map((p) => [p.email.toLowerCase(), p] as const),
  );
  const targetRoot = target.location ?? null;
  const targetIsChrome = isChromeRoot(targetRoot);
  const reserved = new Set<string>();
  const seen = new Set<string>();
  const activeByRoot = new Map<string, Set<string> | null>();
  const folderInUse = (root: string, folder: string): boolean => {
    if (!activeByRoot.has(root)) activeByRoot.set(root, activeChromeFolders(root));
    const active = activeByRoot.get(root);
    return active === null || !!active?.has(folder);
  };
  return picked.map((p) => {
    const origin = sourceRepository.getById(p.sourceId);
    const originRoot = origin?.location ?? null;
    const oldFolder = p.chromeProfile ?? '';
    const key = p.email.toLowerCase();
    const existing = targetByEmail.get(key) ?? null;
    let blocked: string | null = null;
    if (!targetRoot) blocked = 'Target source has no folder';
    else if (!originRoot) blocked = 'Origin source has no folder';
    else if (isChromeRoot(originRoot) && folderInUse(originRoot, oldFolder))
      blocked = 'This profile is open in Chrome, close that window first';
    else if (!oldFolder || !fs.existsSync(path.join(originRoot, oldFolder)))
      blocked = 'Profile folder is missing on disk';
    else if (seen.has(key)) blocked = 'Same email appears more than once in the selection';
    seen.add(key);
    let newFolder = oldFolder;
    if (existing) {
      newFolder = existing.chromeProfile ?? oldFolder;
    } else if (!blocked && targetRoot) {
      newFolder = targetIsChrome
        ? nextChromeProfileName(targetRoot, reserved)
        : pickFreeFolder(targetRoot, folderNameFor(p.email), reserved);
      reserved.add(newFolder.toLowerCase());
    }
    return {
      id: p.id,
      email: p.email,
      oldFolder,
      newFolder,
      folderRule: targetIsChrome ? 'chrome' : 'email',
      blocked,
      conflict: existing
        ? { targetId: existing.id, targetFolder: existing.chromeProfile ?? '', ...compareEmails(existing, p) }
        : null,
    };
  });
}

async function transfer({ ids, targetId, mode, policy, policies }: TransferInput, run?: TransferRun) {
  const isCancelled = run?.isCancelled ?? ((): boolean => false);
  const plan = await planTransfer(ids, targetId);
  const targetRoot = sourceRepository.getById(targetId)?.location ?? null;
  const byId = new Map((await list()).map((p) => [p.id, p] as const));
  const result: TransferOutcome = { transferred: 0, merged: 0, skipped: 0, cancelled: false, failed: [] };
  const sizes = new Map<string, number>();
  if (run?.onPlan) {
    for (const item of plan) {
      const origin = sourceRepository.getById(byId.get(item.id)?.sourceId ?? '')?.location ?? null;
      sizes.set(item.id, !item.blocked && !item.conflict && origin ? await measureFolder(origin, item.oldFolder, isCancelled) : 0);
    }
    run.onPlan(plan.map((i) => ({ id: i.id, email: i.email, bytes: sizes.get(i.id) ?? 0 })));
  }
  for (const item of plan) {
    if (isCancelled()) {
      result.cancelled = true;
      break;
    }
    run?.onItemStart?.(item.id);
    let copied = 0;
    try {
      const from = byId.get(item.id);
      if (!from) throw new AppError('profile not found', 404);
      if (item.blocked) throw new AppError(item.blocked, 400);
      if (item.conflict) {
        const chosen = policies?.[item.id] ?? policy;
        if (chosen !== 'merge' && chosen !== 'overwrite') {
          result.skipped++;
          run?.onItemDone?.(item.id, 'skipped');
          continue;
        }
        const dest = byId.get(item.conflict.targetId);
        if (!dest) throw new AppError('target profile not found', 404);
        const patch = mergePatch(dest, from, chosen === 'overwrite');
        if (Object.keys(patch).length > 0) emailRepository.update(dest.id, patch);
        syncEmailBackup(dest.id);
        if (mode === 'move') removeSync(from.id);
        result.merged++;
        run?.onItemDone?.(item.id, 'merged');
        continue;
      }
      const originRoot = sourceRepository.getById(from.sourceId)?.location ?? null;
      if (!originRoot || !targetRoot) throw new AppError('source has no folder', 400);

      await transferProfileFolder(
        mode,
        { root: originRoot, folder: item.oldFolder },
        { root: targetRoot, folder: item.newFolder },
        {
          isCancelled,
          onBytes: (n) => {
            copied += n;
            run?.onBytes?.(n);
          },
        },
      );
      run?.onBytes?.(Math.max(0, (sizes.get(item.id) ?? 0) - copied));
      const newId = toEmailId(targetId, item.newFolder);
      if (mode === 'move') {
        rekeyEmail(from.id, newId);
        dropEmailBackup(from.id);
      }
      syncEmailBackup(newId);
      result.transferred++;
      run?.onItemDone?.(item.id, 'transferred');
    } catch (err) {
      if (err instanceof TransferCancelled) {
        result.cancelled = true;
        break;
      }
      const message = err instanceof Error ? err.message : String(err);
      result.failed.push({ id: item.id, email: item.email, error: message });
      run?.onItemDone?.(item.id, 'failed', message);
    }
  }
  await dropCaches();
  return result;
}

export const emailService = {
  list,
  find,
  get,
  create,
  createMany,
  update,
  remove,
  removeMany,
  openFolder,
  bulkUpdate,
  transfer,
  previewTransfer: planTransfer,
};