import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/server.config';
import { getDb } from '../database/connection';
import {
  buildPatch,
  deleteRow,
  enc,
  getRow,
  idOf,
  insertRow,
  makeChildStore,
  updateRow,
  type ColumnMap,
  type Input,
} from '../database/sql';
import {
  mapBrowsing,
  mapDevice,
  mapFootprint,
  mapScript,
  mapService,
  mapSource,
  type Row,
} from '../domain/mappers';
import { chromeDefaultDir } from '../utils/system';
import { AppError } from '../utils/http';

// ─── sources ────────────────────────────────────────────────────────────

// Sources live in the `sources` table of profile.sql: the built-in 'local' source (OS Chrome user-data dir) and custom ones the user adds.
// A source whose folder no longer exists is deleted on every read (reconcileSources), so it never shows up.
// ASSUMED: every source folder is a Chrome user-data dir, so browsers is always ['chrome'].
const DEFAULT_SOURCE_ID = 'local';

interface SourceRow {
  id: string;
  name: string;
  path: string;
}

function reconcileSources(): SourceRow[] {
  const db = getDb();
  const chrome = chromeDefaultDir();
  if (fs.existsSync(chrome)) {
    db.prepare(
      `INSERT INTO sources (id, name, path) VALUES (?, 'Local Chrome', ?)
       ON CONFLICT(id) DO UPDATE SET path = excluded.path`,
    ).run(DEFAULT_SOURCE_ID, chrome);
  } else {
    db.prepare('DELETE FROM sources WHERE id = ?').run(DEFAULT_SOURCE_ID);
  }
  const rows = db.prepare('SELECT id, name, path FROM sources ORDER BY id = ? DESC, name ASC').all(DEFAULT_SOURCE_ID) as SourceRow[];
  const alive: SourceRow[] = [];
  for (const r of rows) {
    if (fs.existsSync(r.path)) alive.push(r);
    else db.prepare('DELETE FROM sources WHERE id = ?').run(r.id);
  }
  return alive;
}

function toSource(r: SourceRow) {
  return mapSource({
    id: r.id,
    name: r.name,
    type: 'local',
    browsers: '["chrome"]',
    description: r.id === DEFAULT_SOURCE_ID ? 'Default Google Chrome profiles on this machine' : '',
    location: r.path,
    count: 0,
    last_sync: fs.statSync(r.path).mtimeMs,
    online: 1,
  });
}

function listSources() {
  return reconcileSources().map(toSource);
}

function getSourceById(id: string) {
  const row = reconcileSources().find((r) => r.id === id);
  return row ? toSource(row) : null;
}

function toSourceName(raw: unknown): string {
  return String(raw ?? '').trim();
}

function toSourcePath(raw: unknown): string {
  const p = String(raw ?? '').trim();
  if (!p || !path.isAbsolute(p) || !fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    throw new AppError('source path must be an existing absolute folder', 400);
  }
  return p;
}

function assertUniqueName(name: string, ignoreId?: string): void {
  const taken = getDb()
    .prepare('SELECT 1 FROM sources WHERE name = ? COLLATE NOCASE AND id != ?')
    .get(name, ignoreId ?? '');
  if (!name || taken) throw new AppError('invalid or duplicate source name', 409);
}

function createSource(input: Input) {
  const name = toSourceName(input.name);
  assertUniqueName(name);
  const id = idOf(input);
  getDb().prepare('INSERT INTO sources (id, name, path) VALUES (?, ?, ?)').run(id, name, toSourcePath(input.location ?? input.path));
  return getSourceById(id);
}

function updateSource(id: string, input: Input) {
  const current = reconcileSources().find((r) => r.id === id);
  if (!current) return null;
  if (id === DEFAULT_SOURCE_ID) return toSource(current);
  const name = input.name === undefined ? current.name : toSourceName(input.name);
  assertUniqueName(name, id);
  const nextPath = input.location !== undefined || input.path !== undefined ? toSourcePath(input.location ?? input.path) : current.path;
  getDb().prepare('UPDATE sources SET name = ?, path = ? WHERE id = ?').run(name, nextPath, id);
  return getSourceById(id);
}

// Only the row is removed; the folder on disk is never touched.
function removeSource(id: string): boolean {
  if (id === DEFAULT_SOURCE_ID) throw new AppError('built-in source cannot be removed', 400);
  return getDb().prepare('DELETE FROM sources WHERE id = ?').run(id).changes > 0;
}
export const sourceRepository = {
  list: listSources,
  getById: getSourceById,
  create: createSource,
  update: updateSource,
  remove: removeSource,
};

// ─── services (templates) ───────────────────────────────────────────────

const SERVICE_MAP: ColumnMap = {
  name: ['name'],
  url: ['website_url'],
  authMethods: ['auth_methods', enc.json],
  
  fields: ['custom_fields', enc.json],
  category: ['category'],
  
};

function listServices() {
  const rows = getDb().prepare('SELECT * FROM services ORDER BY name ASC').all() as Row[];
  return rows.map(mapService);
}

function getServiceById(id: string) {
  const row = getRow('services', id);
  return row ? mapService(row) : null;
}

function createService(input: Input) {
  const id = idOf(input);
  insertRow('services', {
    id,
    website_url: '',
    auth_methods: '[]',
    custom_fields: '[]',
    ...buildPatch(input, SERVICE_MAP),
  });
  return getServiceById(id);
}

export const serviceRepository = {
  list: listServices,
  getById: getServiceById,
  create: createService,
  update: (id: string, input: Input) =>
    updateRow('services', id, buildPatch(input, SERVICE_MAP), false) ? getServiceById(id) : null,
  remove: (id: string): boolean => deleteRow('services', id),
};

// ─── email children (footprints, browsing_entries, script_runs, device_activities) ───

export const footprintRepository = makeChildStore({
  table: 'footprints',
  mapRow: mapFootprint,
  orderBy: 'at DESC',
  required: ['ip'],
  defaults: (now) => ({ at: now, last_seen_at: now }),
  map: {
    ip: ['ip'],
    country: ['country'],
    city: ['city'],
    isp: ['isp'],
    ipType: ['ip_type'],
    at: ['at', enc.time],
    lastSeenAt: ['last_seen_at', enc.time],
    sessions: ['sessions'],
    durationMin: ['duration_min'],
    changed: ['changed', enc.bool],
    device: ['device'],
    platform: ['platform'],
    browser: ['browser'],
    screen: ['screen'],
    language: ['language'],
    timezone: ['timezone'],
    userAgent: ['user_agent'],
  },
});

const browsingStore = makeChildStore({
  table: 'browsing_entries',
  mapRow: mapBrowsing,
  orderBy: 'at DESC',
  required: ['url'],
  defaults: (now) => ({ at: now }),
  map: {
    url: ['url'],
    title: ['title'],
    at: ['at', enc.time],
    visits: ['visits'],
    footprintId: ['footprint_id', (v) => v || null],
  },
});

function listBrowsingInRange(emailId: string, from?: number, to?: number) {
  const conds = ['email_id = @emailId'];
  const params: Record<string, unknown> = { emailId };
  if (from !== undefined) {
    conds.push('at >= @from');
    params.from = from;
  }
  if (to !== undefined) {
    conds.push('at < @to');
    params.to = to;
  }
  const rows = getDb()
    .prepare(`SELECT * FROM browsing_entries WHERE ${conds.join(' AND ')} ORDER BY at DESC`)
    .all(params) as Row[];
  return rows.map(mapBrowsing);
}

export const browsingEntryRepository = {
  ...browsingStore,
  listInRange: listBrowsingInRange,
  clear: (emailId: string): number =>
    getDb().prepare('DELETE FROM browsing_entries WHERE email_id = ?').run(emailId).changes,
};

export const scriptRunRepository = makeChildStore({
  table: 'script_runs',
  mapRow: mapScript,
  orderBy: 'at DESC',
  required: ['scriptName'],
  defaults: (now) => ({ at: now }),
  map: {
    scriptName: ['script_name'],
    status: ['status'],
    at: ['at', enc.time],
    durationSec: ['duration_sec'],
    note: ['note'],
  },
});

export const deviceActivityRepository = makeChildStore({
  table: 'device_activities',
  mapRow: mapDevice,
  orderBy: 'at DESC',
  required: ['device'],
  defaults: (now) => ({ at: now }),
  map: {
    device: ['device'],
    os: ['os'],
    browser: ['browser'],
    action: ['action'],
    at: ['at', enc.time],
    trusted: ['trusted', enc.bool],
  },
});