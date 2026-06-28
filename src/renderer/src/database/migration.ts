/**
 * Database Migration System (DEPRECATED in renderer)
 * 
 * Migration đã được chuyển sang main process:
 * @see src/main/core/database/migration.ts
 * 
 * File này giữ lại để tham khảo schema và logic.
 * Schema trong main process là nguồn chính thức (source of truth).
 * 
 * Đảm bảo schema mỗi table khớp chính xác với định nghĩa.
 * Cột không có trong schema → tự động xóa.
 * Cột thiếu → tự động thêm.
 */

// ============================================================
// SCHEMA DEFINITION
// ============================================================
const SCHEMA: Record<string, Record<string, string>> = {
  targets: {
    id: 'TEXT PRIMARY KEY',
    title: 'TEXT NOT NULL',
    url: 'TEXT',
    icon: 'TEXT',
    platform: 'TEXT',
    last_used_at: 'INTEGER',
    executable_path: 'TEXT',
    startup_args: 'TEXT',
    environment: 'TEXT',
    created_at: 'INTEGER DEFAULT (unixepoch())',
    updated_at: 'INTEGER DEFAULT (unixepoch())',
  },
};

// ============================================================
// MIGRATION LOGIC
// ============================================================

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

async function runQuery(query: string, params: any[] = []): Promise<any> {
  return window.api.invoke('sqlite:execute', { query, params });
}

function buildCreateTableSQL(tableName: string, columns: Record<string, string>): string {
  const colDefs = Object.entries(columns)
    .map(([name, def]) => `  ${name} ${def}`)
    .join(',\n');
  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${colDefs}\n);`;
}

async function getExistingColumns(tableName: string): Promise<ColumnInfo[]> {
  const result = await runQuery(`PRAGMA table_info('${tableName}')`);
  return result?.rows || [];
}

async function migrateTable(
  tableName: string,
  expectedColumns: Record<string, string>,
): Promise<void> {
  // 1. Tạo bảng nếu chưa tồn tại
  const createSQL = buildCreateTableSQL(tableName, expectedColumns);
  await runQuery(createSQL);
  console.log(`[Migration] Ensured table: ${tableName}`);

  // 2. Lấy danh sách cột hiện tại
  const existingColumns = await getExistingColumns(tableName);
  const existingNames = new Set(existingColumns.map((c) => c.name));
  const expectedNames = new Set(Object.keys(expectedColumns));

  // 3. Xóa cột không có trong schema
  for (const col of existingColumns) {
    if (!expectedNames.has(col.name)) {
      try {
        // Xóa index liên quan trước (nếu có)
        const indexes = await runQuery(
          `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql LIKE '%${col.name}%'`,
          [tableName],
        );
        if (indexes?.rows) {
          for (const idx of indexes.rows) {
            await runQuery(`DROP INDEX IF EXISTS ${idx.name}`);
            console.log(`[Migration] Dropped index: ${idx.name}`);
          }
        }
        await runQuery(`ALTER TABLE ${tableName} DROP COLUMN ${col.name}`);
        console.log(`[Migration] Dropped column: ${tableName}.${col.name}`);
      } catch (err) {
        console.warn(`[Migration] Could not drop column ${tableName}.${col.name}:`, err);
      }
    }
  }

  // 4. Thêm cột thiếu
  for (const [colName, colDef] of Object.entries(expectedColumns)) {
    if (!existingNames.has(colName)) {
      try {
        // Cột PRIMARY KEY không thể thêm bằng ALTER TABLE
        if (colDef.toUpperCase().includes('PRIMARY KEY')) continue;
        await runQuery(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
        console.log(`[Migration] Added column: ${tableName}.${colName}`);
      } catch (err) {
        console.warn(`[Migration] Could not add column ${tableName}.${colName}:`, err);
      }
    }
  }
}

// ============================================================
// MAIN ENTRY
// ============================================================

export async function runMigrations(): Promise<void> {
  console.log('[Migration] Starting schema migration...');

  for (const [tableName, columns] of Object.entries(SCHEMA)) {
    await migrateTable(tableName, columns);
  }

  // Tạo indexes
  await createIndexes();

  console.log('[Migration] Schema migration complete');
}

async function createIndexes(): Promise<void> {
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform);`,
    `CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at);`,
    `CREATE INDEX IF NOT EXISTS idx_targets_last_used ON targets(last_used_at);`,
  ];

  for (const idx of indexes) {
    await runQuery(idx);
  }
}