/**
 * ------------------------------------------------------------------
 * Database Controller
 * ------------------------------------------------------------------
 * Ported from internal/handler/database/handler.go. Exposes GET/PUT for
 * the active SQLite file path and hot-swaps the connection on update,
 * including the same write-permission pre-checks as the Go handler.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ── Local 
import { getConfig, setDbPath } from '../config/server.config';
import { getCurrentPath, reinit } from '../database/connection';
import { json, fail } from '../utils/response';
import { AppError } from '../utils/api-error';

// ─── Helpers ────────────────────────────────────────────────────────────

function expandHome(p: string): string {
  if (!p.startsWith('~')) return p;
  return path.join(os.homedir(), p.slice(1));
}

// ─── Controller ───────────────────────────────────────────────────────

export const getPath = (_req: Request, res: Response, next: NextFunction) => {
  try {
    const current = getCurrentPath();
    json(res, 200, { path: current || getConfig().dbPath });
  } catch (err) { next(err); }
};

export const updatePath = (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as { path?: string };
    if (!body.path || body.path === '') throw new AppError('path is required', 400);

    const newPath = expandHome(body.path);
    const dir = path.dirname(newPath);

    // 1. Ensure parent directory exists (or can be created).
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    } catch (err) {
      throw new AppError(`cannot create directory: ${(err as Error).message}`, 400);
    }

    // 2. Verify write permission by creating a temp probe file.
    const testFile = path.join(dir, '.phantoma_test_write');
    try {
      fs.writeFileSync(testFile, 'test', { mode: 0o644 });
    } catch (err) {
      throw new AppError(`no write permission in directory: ${(err as Error).message}`, 400);
    } finally {
      try { fs.rmSync(testFile, { force: true }); } catch { /* ignore cleanup errors */ }
    }

    // Update config + swap the live connection.
    setDbPath(newPath);
    try {
      reinit(newPath);
    } catch (err) {
      throw new AppError(`failed to re-initialize database: ${(err as Error).message}`, 500);
    }

    json(res, 200, { path: newPath, status: 'updated' });
  } catch (err) { next(err); }
};