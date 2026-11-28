/**
 * ------------------------------------------------------------------
 * Preferences Store (CODE)
 * ------------------------------------------------------------------
 * Saves and retrieves the last used port to ~/.phantoma/code/prefs.json.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PREFS_DIR = path.join(os.homedir(), '.phantoma', 'code');
const PREFS_FILE = path.join(PREFS_DIR, 'prefs.json');

interface Prefs {
  lastPort?: number;
}

function readPrefs(): Prefs {
  try {
    const raw = fs.readFileSync(PREFS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    fs.mkdirSync(PREFS_DIR, { recursive: true });
    fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2), 'utf8');
  } catch {
    // ignore
  }
}

export function getLastPort(): number | undefined {
  return readPrefs().lastPort;
}

export function saveLastPort(port: number, defaultPort: number): void {
  if (port === defaultPort) return;
  const prefs = readPrefs();
  prefs.lastPort = port;
  writePrefs(prefs);
}