import type BetterSqlite3 from 'better-sqlite3';

interface ForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string | null;
  on_delete: string;
}

export interface OrphanReport {
  table: string;
  column: string;
  parent: string;
  action: 'deleted' | 'nulled';
  count: number;
}

const MAX_PASSES = 10;
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

const q = (name: string): string => `"${name.replace(/"/g, '""')}"`;

/**
 * Tự động dọn record mồ côi cho MỌI bảng có khai báo FOREIGN KEY.
 * - Field trỏ tới id của bảng khác mà id đó không còn tồn tại:
 *   + ON DELETE SET NULL -> set NULL
 *   + còn lại (CASCADE / NO ACTION) -> xóa record
 * - Lặp nhiều lượt vì xóa record ở bảng cha có thể tạo thêm orphan ở bảng con (scopes -> worktrees -> projects ...).
 * ASSUMED: chỉ xử lý FK đơn cột đã khai báo trong schema; cột `*_id` không có REFERENCES không bị đụng tới.
 */
export function sweepOrphans(db: BetterSqlite3.Database): OrphanReport[] {
  const tables = (
    db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all() as {
      name: string;
    }[]
  ).map((t) => t.name);
  const reports: OrphanReport[] = [];

  const pass = (): number => {
    let total = 0;
    for (const table of tables) {
      const fks = db.prepare(`PRAGMA foreign_key_list(${q(table)})`).all() as ForeignKey[];
      const composite = new Set(fks.filter((f) => f.seq > 0).map((f) => f.id));
      for (const fk of fks) {
        if (composite.has(fk.id) || !tables.includes(fk.table)) continue;
        const parentCols = db.prepare(`PRAGMA table_info(${q(fk.table)})`).all() as {
          name: string;
          pk: number;
        }[];
        const parentCol = fk.to ?? parentCols.find((c) => c.pk === 1)?.name;
        if (!parentCol) continue;

        const setNull = (fk.on_delete ?? '').toUpperCase() === 'SET NULL';
        const where = `${q(fk.from)} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${q(fk.table)} p WHERE p.${q(parentCol)} = ${q(table)}.${q(fk.from)})`;
        const sql = setNull
          ? `UPDATE ${q(table)} SET ${q(fk.from)} = NULL WHERE ${where}`
          : `DELETE FROM ${q(table)} WHERE ${where}`;
        const { changes } = db.prepare(sql).run();
        if (changes > 0) {
          total += changes;
          reports.push({
            table,
            column: fk.from,
            parent: fk.table,
            action: setNull ? 'nulled' : 'deleted',
            count: changes,
          });
        }
      }
    }
    return total;
  };

  for (let i = 0; i < MAX_PASSES; i++) {
    if (db.transaction(pass)() === 0) break;
  }

  return reports;
}

export function startOrphanSweeper(
  db: BetterSqlite3.Database,
  intervalMs = DEFAULT_INTERVAL_MS,
): () => void {
  const timer = setInterval(() => {
    try {
      sweepOrphans(db);
    } catch (err) {
      console.warn('[integrity] orphan sweep failed', err);
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}