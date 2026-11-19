import fs from 'fs';
import path from 'path';
import { emailCache } from '../cache/email.cache';
import { serviceEmailCache } from '../cache/service_email.cache';
import { getDb } from '../database/connection';
import { requireFields, type Input } from '../database/sql';
import { emailRepository } from '../repositories/email.repository';
import { sourceRepository } from '../repositories/service.repository';
import { serviceEmailRepository } from '../repositories/service_email.repository';
import { sessionRepository } from '../repositories/session.repository';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';
import { createLogger } from '../utils/logger';
import { deleteSourceBackup, renameSourceBackup } from '../database/backup';
import { rebuildSourceBackup } from './backup.service';
import { emailService } from './email.service';

const logger = createLogger('SourceSync');

const IGNORED_FOLDERS = new Set(['Guest Profile', 'System Profile']);
const GENERIC_NAMES = new Set(['your chrome', 'chrome', 'default']);
const MAX_AVATAR_BYTES = 300 * 1024;

export interface SyncResult {
  found: number;
  created: number;
  updated: number;
  skipped: number;
}

interface ScannedProfile {
  folder: string;
  email: string;
  name: string;
  avatar: string | null;
}

function readJson(file: string): any {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readEmail(prefs: any): string | undefined {
  const candidates = [
    prefs?.account_info?.[0]?.email,
    prefs?.signin?.allowed_username,
    prefs?.google?.services?.last_signed_in,
    prefs?.google?.services?.last_gaia_account?.email,
  ];
  const hit = candidates.find((v) => typeof v === 'string' && v.includes('@'));
  return hit ? String(hit).trim().toLowerCase() : undefined;
}

function pickAvatar(prefs: any, profileDir: string): string | null {
  const candidates = [
    prefs?.account_info?.[0]?.picture_url,
    prefs?.account_info?.[0]?.last_downloaded_image_url_with_size,
  ];
  const url = candidates.find((v) => typeof v === 'string' && /^https?:\/\//i.test(v.trim()));
  if (url) return String(url).trim();

  const file = path.join(profileDir, 'Google Profile Picture.png');
  try {
    if (!fs.existsSync(file) || fs.statSync(file).size > MAX_AVATAR_BYTES) return null;
    return `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  } catch {
    return null;
  }
}

function isGenericName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return !n || GENERIC_NAMES.has(n) || /^person \d+$/.test(n);
}

function pickName(prefs: any, info: any, email: string): string {
  const candidates: unknown[] = [
    prefs?.account_info?.[0]?.full_name,
    info?.gaia_name,
    info?.gaia_given_name,
    info?.is_using_default_name === true ? undefined : info?.name,
    prefs?.profile?.name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && !isGenericName(c)) return c.trim();
  }
  return email.split('@')[0];
}

function scanLocation(location: string): ScannedProfile[] {
  const localState = readJson(path.join(location, 'Local State'));
  const infoCache = localState?.profile?.info_cache ?? {};
  const out: ScannedProfile[] = [];
  for (const entry of fs.readdirSync(location, { withFileTypes: true })) {
    if (!entry.isDirectory() || IGNORED_FOLDERS.has(entry.name)) continue;
    const prefs = readJson(path.join(location, entry.name, 'Preferences'));
    const fromName = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.name) ? entry.name.toLowerCase() : undefined;
    if (!prefs && !fromName) continue;
    const email = (prefs ? readEmail(prefs) : undefined) ?? fromName;
    if (!email) continue;
    out.push({
      folder: entry.name,
      email,
      name: pickName(prefs, infoCache[entry.name], email),
      avatar: pickAvatar(prefs, path.join(location, entry.name)),
    });
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder, undefined, { numeric: true }));
}

async function list() {
  return sourceRepository.list();
}

async function find(id: string) {
  return sourceRepository.getById(id);
}

async function get(id: string) {
  return found(await find(id), 'source');
}

async function create(input: Input) {
  requireFields(input, ['name']);
  const base = String(input.location ?? input.path ?? '').trim();
  if (!base || !path.isAbsolute(base) || !fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    throw new AppError('source path must be an existing absolute folder', 400);
  }
  const dir = path.join(base, String(input.name).trim().replace(/[\\/]/g, '-')); // ASSUMED: source mới = folder con mang tên source, tạo trong folder user chọn
  fs.mkdirSync(dir, { recursive: true });
  return sourceRepository.create({ ...input, location: dir });
}

// ASSUMED: import adopts the chosen folder as-is (no sub-folder, unlike create), then syncs Chrome profiles and rebuilds the backup from emails already on disk
async function importExisting(input: Input) {
  const location = String(input.location ?? input.path ?? '').trim();
  if (!location || !path.isAbsolute(location) || !fs.existsSync(location) || !fs.statSync(location).isDirectory()) {
    throw new AppError('source path must be an existing absolute folder', 400);
  }
  const resolved = path.resolve(location);
  if ((await list()).some((s) => s.location && path.resolve(s.location) === resolved)) {
    throw new AppError('this folder is already a source', 409);
  }
  const name = String(input.name ?? '').trim() || path.basename(resolved);
  const source = sourceRepository.create({ name, location: resolved });
  if (!source) throw new AppError('cannot import source', 500);
  await syncSource(source);
  await emailCache.invalidate();
  return found(await find(source.id), 'source');
}

export interface SourcePreviewProfile {
  folder: string;
  email: string | null;
  name: string;
  hasEmail: boolean;
  synced: boolean;
}

export interface SourcePreview {
  valid: boolean;
  reason?: string;
  total: number;
  withEmail: number;
  profiles: SourcePreviewProfile[];
}

const PREVIEW_LIMIT = 2000;

async function preview(input: Input): Promise<SourcePreview> {
  const empty = { total: 0, withEmail: 0, profiles: [] };
  const location = String(input.path ?? input.location ?? '').trim();
  if (!location || !path.isAbsolute(location) || !fs.existsSync(location) || !fs.statSync(location).isDirectory()) {
    return { valid: false, reason: 'Folder does not exist', ...empty };
  }
  const localState = readJson(path.join(location, 'Local State'));

  const infoCache = localState?.profile?.info_cache ?? {};
  const known = new Set((await emailService.list()).map((p) => p.email.toLowerCase()));
  const rows: SourcePreviewProfile[] = [];
  for (const entry of fs.readdirSync(location, { withFileTypes: true })) {
    if (!entry.isDirectory() || IGNORED_FOLDERS.has(entry.name)) continue;
    const prefs = readJson(path.join(location, entry.name, 'Preferences'));
    const fromName = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.name) ? entry.name.toLowerCase() : undefined;
    if (!prefs && !fromName) continue;
    const email = (prefs ? readEmail(prefs) : undefined) ?? fromName ?? null;
    const cachedName = infoCache[entry.name]?.name;
    rows.push({
      folder: entry.name,
      email,
      name: email ? pickName(prefs, infoCache[entry.name], email) : typeof cachedName === 'string' ? cachedName : entry.name,
      hasEmail: !!email,
      synced: !!email && known.has(email),
    });
  }
  if (rows.length === 0) return { valid: false, reason: 'Not a source: no Chrome profile folders found', ...empty };
  rows.sort((a, b) => a.folder.localeCompare(b.folder, undefined, { numeric: true }));
  return {
    valid: true,
    total: rows.length,
    withEmail: rows.filter((r) => r.hasEmail).length,
    profiles: rows.slice(0, PREVIEW_LIMIT),
  };
}

async function update(id: string, input: Input) {
  const oldName = sourceRepository.getById(id)?.name;
  const row = sourceRepository.update(id, input);
  if (row && oldName && row.name !== oldName) renameSourceBackup(oldName, row.name);
  if (row) rebuildSourceBackup(id);
  await emailCache.invalidate();
  return found(row, 'source');
}

async function remove(id: string): Promise<void> {
  const emailIds = emailRepository.listIdsBySource(id);
  const name = sourceRepository.getById(id)?.name;
  const ok = sourceRepository.remove(id);
  if (ok) {
    if (name) deleteSourceBackup(name);
    emailIds.forEach((emailId) => {
      serviceEmailRepository.purge(emailId);
      sessionRepository.purge(emailId);
    });
    await Promise.all([emailCache.invalidate(), serviceEmailCache.invalidate()]);
  }
  if (!ok) throw new AppError('source not found', 404);
}

// Emails live as email.json inside each source folder, so a source folder deleted by hand leaves no orphan rows; listing sources already drops dead ones.
async function reconcile(): Promise<number> {
  await list();
  await emailCache.invalidate();
  return 0;
}

export async function syncSource(source: {
  id: string;
  name: string;
  location?: string | null;
}): Promise<SyncResult> {
  const result: SyncResult = { found: 0, created: 0, updated: 0, skipped: 0 };
  if (!source.location || !fs.existsSync(source.location)) return result;

  const scanned = scanLocation(source.location);
  result.found = scanned.length;
  await emailCache.invalidate();
  const existing = new Map((await emailService.list(source.id)).map((p) => [p.email.toLowerCase(), p]));

  for (const item of scanned) {
    const current = existing.get(item.email);
    if (current) {
      const patch: Record<string, unknown> = {};
      if (isGenericName(current.displayName ?? '') && item.name !== current.displayName) {
        patch.displayName = item.name;
      }
      if (item.avatar && item.avatar !== current.avatarUrl) patch.avatarUrl = item.avatar;
      if (Object.keys(patch).length > 0) {
        await emailService.update(current.id, patch);
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }
    const hue = Array.from(item.email).reduce((h, ch) => h + ch.charCodeAt(0), 0) % 360;
    await emailService.create({
      sourceId: source.id,
      email: item.email,
      displayName: item.name,
      avatarHue: hue,
      avatarUrl: item.avatar,
      chromeSync: 'synced',
      chromeProfile: item.folder,
    });
    result.created++;
  }

  logger.info(
    `Source "${source.name}": found ${result.found}, created ${result.created}, updated ${result.updated}, skipped ${result.skipped}`,
  );
  rebuildSourceBackup(source.id);
  return result;
}

async function sync(id: string): Promise<SyncResult> {
  return syncSource(await get(id));
}

async function syncLocal(sourceId?: string) {
  const targets = (await list()).filter((s) => s.type === 'local' && (!sourceId || s.id === sourceId));
  const out: ({ sourceId: string } & SyncResult)[] = [];
  for (const s of targets) out.push({ sourceId: s.id, ...(await syncSource(s)) });
  return out;
}

export const sourceService = { list, find, get, create, importExisting, preview, update, remove, reconcile, sync, syncLocal };