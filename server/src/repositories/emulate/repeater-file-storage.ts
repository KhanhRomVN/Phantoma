/**
 * ------------------------------------------------------------------
 * Repeater File Storage
 * ------------------------------------------------------------------
 * Ported from internal/repository/emulate/repeater_file_storage.go.
 * Stores params.json / headers.json / body.json per repeater request:
 *   ~/.phantoma/emulate:{targetId}/repeaters/repeater_{requestId}/
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── External 
import fs from 'fs';
import path from 'path';

// ── Local 
import { getAppDataDir } from '../../config/server.config';

// ─── Helpers ────────────────────────────────────────────────────────────

function getRepeaterDir(targetID: string, requestID: string): string {
  return path.join(
    getAppDataDir(),
    `emulate:${targetID}`,
    'repeaters',
    `repeater_${requestID}`,
  );
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

// ─── Storage ────────────────────────────────────────────────────────────

export class RepeaterFileStorage {
  writeParams(targetID: string, requestID: string, content: string): void {
    const dir = getRepeaterDir(targetID, requestID);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'params.json'), content, { mode: 0o600 });
  }

  readParams(targetID: string, requestID: string): string {
    const filePath = path.join(getRepeaterDir(targetID, requestID), 'params.json');
    if (!fs.existsSync(filePath)) return '[]';
    return fs.readFileSync(filePath, 'utf8');
  }

  writeHeaders(targetID: string, requestID: string, content: string): void {
    const dir = getRepeaterDir(targetID, requestID);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'headers.json'), content, { mode: 0o600 });
  }

  readHeaders(targetID: string, requestID: string): string {
    const filePath = path.join(getRepeaterDir(targetID, requestID), 'headers.json');
    if (!fs.existsSync(filePath)) return '[]';
    return fs.readFileSync(filePath, 'utf8');
  }

  writeBody(targetID: string, requestID: string, content: string): void {
    const dir = getRepeaterDir(targetID, requestID);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'body.json'), content, { mode: 0o600 });
  }

  readBody(targetID: string, requestID: string): string {
    const filePath = path.join(getRepeaterDir(targetID, requestID), 'body.json');
    if (!fs.existsSync(filePath)) return '';
    return fs.readFileSync(filePath, 'utf8');
  }

  deleteAll(targetID: string, requestID: string): void {
    const dir = getRepeaterDir(targetID, requestID);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}