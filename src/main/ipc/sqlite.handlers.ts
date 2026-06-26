import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';

// Cache database connections
const dbConnections = new Map<string, sqlite3.Database>();

export function setupSqliteHandlers() {
  // Open SQLite file dialog
  ipcMain.handle('dialog:open-sqlite', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      return { canceled: true, filePath: null };
    }

    const result = await dialog.showOpenDialog(win, {
      title: 'Select SQLite Database File',
      properties: ['openFile', 'showHiddenFiles'],
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3', 'db3', 'sql'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: process.env.HOME || process.env.USERPROFILE,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePath: null };
    }

    return { canceled: false, filePath: result.filePaths[0] };
  });

  // Save SQLite file dialog (create new file)
  ipcMain.handle('dialog:save-sqlite', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      return { canceled: true, filePath: null };
    }

    const result = await dialog.showSaveDialog(win, {
      title: 'Create New SQLite Database File',
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      defaultPath: path.join(process.env.HOME || process.env.USERPROFILE || '', 'phantoma.sql'),
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null };
    }

    // Create empty SQLite file
    try {
      const filePath = result.filePath;
      // Check if file already exists
      if (!fs.existsSync(filePath)) {
        // Create empty file with SQLite header
        const header = Buffer.from('SQLite format 3\0', 'utf8');
        const emptyDb = Buffer.alloc(16);
        header.copy(emptyDb);
        fs.writeFileSync(filePath, emptyDb);
      }
      return { canceled: false, filePath };
    } catch (err) {
      console.error('[sqlite.handlers] Failed to create SQLite file:', err);
      return { canceled: true, filePath: null, error: err instanceof Error ? err.message : 'Failed to create file' };
    }
  });

  // Automatic database setup
  ipcMain.handle('database:setup-auto', async () => {
    return new Promise((resolve) => {
      try {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        if (!homeDir) {
          resolve({ success: false, error: 'Unable to determine home directory' });
          return;
        }

        const phantomaDir = path.join(homeDir, '.phantoma');
        const dbPath = path.join(phantomaDir, 'phantoma.sql');

        // Create .phantoma folder if it doesn't exist
        if (!fs.existsSync(phantomaDir)) {
          fs.mkdirSync(phantomaDir, { recursive: true });
          console.log('[sqlite.handlers] Created folder:', phantomaDir);
        }

        // Check if file exists
        const fileExists = fs.existsSync(dbPath);
        
        // Always create a fresh valid database
        // Delete old file if exists but corrupted
        if (fileExists) {
          try {
            // Try to open and validate
            const testDb = new sqlite3.Database(dbPath);
            testDb.close();
            console.log('[sqlite.handlers] Database file already exists and valid:', dbPath);
            resolve({ success: true, filePath: dbPath });
            return;
          } catch (e) {
            // File corrupted, delete it
            console.log('[sqlite.handlers] Database file corrupted, recreating...');
            fs.unlinkSync(dbPath);
          }
        }

        // Create new database with schema
        const db = new sqlite3.Database(dbPath);
        console.log('[sqlite.handlers] Created database file:', dbPath);

        // Create targets table
        db.run(
          `CREATE TABLE IF NOT EXISTS targets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT,
            platform TEXT,
            status TEXT DEFAULT 'stored',
            last_used_at INTEGER,
            executable_path TEXT,
            startup_args TEXT,
            environment TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
          )`,
          (err) => {
            if (err) {
              console.error('[sqlite.handlers] Failed to create targets table:', err.message);
              db.close();
              resolve({ success: false, error: err.message });
            } else {
              console.log('[sqlite.handlers] Targets table created');
              
              // Create indexes
              db.run(`CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform)`, () => {});
              db.run(`CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at)`, () => {});
              
              db.close(() => {
                console.log('[sqlite.handlers] Database setup complete');
                resolve({ success: true, filePath: dbPath });
              });
            }
          }
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to setup database';
        console.error('[sqlite.handlers] Database setup failed:', errorMsg);
        resolve({ success: false, error: errorMsg });
      }
    });
  });

  // Validate SQLite file
  ipcMain.handle('sqlite:validate', async (_, filePath: string) => {
    try {
      if (!filePath) {
        return { valid: false, error: 'No file path provided' };
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      // Check if it's a file (not directory)
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return { valid: false, error: 'Path is not a file' };
      }

      // Read first 16 bytes to check SQLite header
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      // SQLite header: "SQLite format 3\000" (first 16 bytes)
      const expectedHeader = Buffer.from('SQLite format 3\0', 'utf8');
      const headerMatch = buffer.equals(expectedHeader);

      if (!headerMatch) {
        // Check if it's a valid SQLite header with different version
        const headerStr = buffer.toString('utf8', 0, 15);
        if (headerStr.startsWith('SQLite format 3')) {
          return { valid: true };
        }
        return { valid: false, error: 'File does not appear to be a valid SQLite database' };
      }

      return { valid: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error validating SQLite file';
      return { valid: false, error: errorMsg };
    }
  });

  // Execute SQL query
  ipcMain.handle('sqlite:execute', async (_, payload: { query: string; params: any[] }) => {
    return new Promise((resolve) => {
      try {
        const { query, params = [] } = payload;

        // Sử dụng database path từ auto setup
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const dbPath = path.join(homeDir, '.phantoma', 'phantoma.sql');

        // Kiểm tra file tồn tại
        if (!fs.existsSync(dbPath)) {
          resolve({
            success: false,
            error: 'Database file not found. Please setup database first.',
            rows: [],
            changes: 0,
            lastInsertRowid: 0,
          });
          return;
        }

        // Get or create database connection
        let db = dbConnections.get(dbPath);
        if (!db) {
          db = new sqlite3.Database(dbPath);
          dbConnections.set(dbPath, db);
          console.log('[sqlite.handlers] Connected to database:', dbPath);
          
          // Initialize database schema if not exists
          db.run(
            `CREATE TABLE IF NOT EXISTS targets (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              url TEXT,
              platform TEXT,
              status TEXT DEFAULT 'stored',
              last_used_at INTEGER,
              executable_path TEXT,
              startup_args TEXT,
              environment TEXT,
              created_at INTEGER DEFAULT (strftime('%s', 'now')),
              updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )`,
            (err) => {
              if (err) {
                console.error('[sqlite.handlers] Failed to create targets table:', err.message);
              } else {
                console.log('[sqlite.handlers] Targets table created/verified');
              }
            }
          );
          
          // Create indexes
          db.run(`CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status)`, () => {});
          db.run(`CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform)`, () => {});
          db.run(`CREATE INDEX IF NOT EXISTS idx_targets_updated_at ON targets(updated_at)`, () => {});
        }

        const isSelect = query.trim().toUpperCase().startsWith('SELECT');

        if (isSelect) {
          // For SELECT, use db.all()
          db.all(query, params, (err, rows) => {
            if (err) {
              console.error('[sqlite.handlers] Execute error:', err.message);
              resolve({
                success: false,
                error: err.message,
                rows: [],
                changes: 0,
                lastInsertRowid: 0,
              });
            } else {
              resolve({
                success: true,
                rows: rows || [],
                changes: 0,
                lastInsertRowid: 0,
              });
            }
          });
        } else {
          // For INSERT/UPDATE/DELETE, use db.run()
          db.run(query, params, function (err) {
            if (err) {
              console.error('[sqlite.handlers] Execute error:', err.message);
              resolve({
                success: false,
                error: err.message,
                rows: [],
                changes: 0,
                lastInsertRowid: 0,
              });
            } else {
              resolve({
                success: true,
                rows: [],
                changes: this.changes || 0,
                lastInsertRowid: this.lastID || 0,
              });
            }
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error executing SQL';
        console.error('[sqlite.handlers] Execute error:', errorMsg);
        resolve({
          success: false,
          error: errorMsg,
          rows: [],
          changes: 0,
          lastInsertRowid: 0,
        });
      }
    });
  });

  // Close all database connections (call on app quit)
  ipcMain.handle('sqlite:close-all', async () => {
    for (const [path, db] of dbConnections) {
      try {
        db.close();
        console.log('[sqlite.handlers] Closed connection to:', path);
      } catch (err) {
        console.error('[sqlite.handlers] Error closing connection:', err);
      }
    }
    dbConnections.clear();
    return { success: true };
  });
}