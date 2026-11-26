import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join, relative, sep } from 'path';
import initSqlJs from 'sql.js';
import { logger } from '../utils/logger';

const ROOT = join(homedir(), '.phantoma');
const ROW_LIMIT = 500;
const SQLITE_MAGIC = 'SQLite format 3\0';

interface SqlFile {
  id: string;
  group: string;
  name: string;
  path: string;
  exists: boolean;
}

// ASSUMED: nguồn thứ 5 là ~/.phantoma/phantoma.sql (đề bài ghi ".phantoma.phantoma.sql")
const FIXED_FILES = [
  { group: 'code', path: join(ROOT, 'code', 'code.sql') },
  { group: 'profile', path: join(ROOT, 'profile', 'profile.sql') },
  { group: 'proxy', path: join(ROOT, 'proxy', 'proxy.sql') },
  { group: 'phantoma', path: join(ROOT, 'phantoma.sql') },
];
const BACKUP_DIR = join(ROOT, 'profile', 'backup');

const exists = (p: string) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );

const toId = (p: string) => relative(ROOT, p).split(sep).join('/');

async function listSqlFiles(): Promise<SqlFile[]> {
  const files: { group: string; path: string }[] = [...FIXED_FILES];
  const dirents = await fs.readdir(BACKUP_DIR, { withFileTypes: true }).catch(() => []);
  dirents
    .filter((d) => d.isFile() && d.name.endsWith('.sql'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((d) => files.push({ group: 'profile/backup', path: join(BACKUP_DIR, d.name) }));
  return Promise.all(
    files.map(async (f) => ({
      id: toId(f.path),
      group: f.group,
      name: f.path.split(sep).pop() as string,
      path: f.path,
      exists: await exists(f.path),
    })),
  );
}

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;
const getSql = () => (sqlPromise ??= initSqlJs());

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

const toCell = (v: unknown): unknown => (v instanceof Uint8Array ? `<blob ${v.length} bytes>` : v);

async function readSqlFile(id: string) {
  const file = (await listSqlFiles()).find((f) => f.id === id);
  if (!file) return { error: 'File không nằm trong danh sách cho phép' };
  if (!file.exists) return { error: 'File không tồn tại' };

  const buf = await fs.readFile(file.path);
  const SQL = await getSql();
  const isSqlite = buf.subarray(0, 16).toString('latin1') === SQLITE_MAGIC;
  const walSize = await fs.stat(`${file.path}-wal`).then(
    (s) => s.size,
    () => 0,
  );
  if (walSize > 0) {
    logger.warn(
      `[sqlview:read] [DEBUG] ${id} có file -wal (${walSize} bytes) chưa checkpoint — sql.js KHÔNG đọc WAL nên dữ liệu có thể thiếu`,
    );
  }
  const db = isSqlite ? new SQL.Database(new Uint8Array(buf)) : new SQL.Database();
  try {
    if (!isSqlite) db.exec(buf.toString('utf8'));
    const names = (
      db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )[0]?.values ?? []
    ).map((r) => String(r[0]));

    const tables = names.map((name) => {
      const q = quoteIdent(name);
      const total = Number(db.exec(`SELECT COUNT(*) FROM ${q}`)[0]?.values[0][0] ?? 0);
      const res = db.exec(`SELECT * FROM ${q} LIMIT ${ROW_LIMIT}`)[0];
      const columns =
        res?.columns ??
        (db.exec(`PRAGMA table_info(${q})`)[0]?.values ?? []).map((r) => String(r[1]));
      const rows = (res?.values ?? []).map((r) => r.map(toCell));
      return { name, columns, rows, total };
    });
    return { id, path: file.path, size: buf.length, format: isSqlite ? 'sqlite' : 'dump', tables };
  } finally {
    db.close();
  }
}

export function setupSqlViewerHandlers(): void {
  ipcMain.handle('sqlview:list', async () => listSqlFiles());

  ipcMain.handle('sqlview:read', async (_event, id: string) => {
    try {
      return await readSqlFile(id);
    } catch (e: any) {
      logger.error('[sqlview:read] Error:', e);
      return { error: e.message || String(e) };
    }
  });
}
