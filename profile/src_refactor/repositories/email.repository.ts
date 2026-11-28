import fs from 'fs';
import path from 'path';
import { getDb } from '../database/connection';
import { idOf, type Input } from '../database/sql';
import { mapEmail, type EmailFile } from '../domain/mappers';
import { getProfileDir, toEmailId } from '../utils/browser-folder';
import { AppError } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('EmailRepository');

// An email is the folder <profilesDir>/<id>/ holding email.json (+ service_email.sql and the browser dirs)
const EMAIL_FILE = 'email.json';

const FIELD_MAP: Record<string, keyof EmailFile> = {
  email: 'email',
  displayName: 'display_name',
  avatarHue: 'avatar_hue',
  avatarUrl: 'avatar_url',
  recoveryEmail: 'recovery_email',
  phone: 'phone_number',
  totpSecret: 'totp',
  backupCodes: 'backup_codes',
  password: 'password',
  status: 'status',
  statusNote: 'status_note',
};

function fileOf(id: string): string {
  return path.join(getProfileDir(id), EMAIL_FILE);
}

function readFile(id: string): EmailFile | null {
  try {
    return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')) as EmailFile;
  } catch {
    return null;
  }
}

function writeFile(id: string, data: EmailFile): void {
  fs.mkdirSync(getProfileDir(id), { recursive: true });
  fs.writeFileSync(fileOf(id), JSON.stringify(data, null, 2) + '\n');
}

// Emails are the Chrome profile folders of every source that already hold an email.json
function listIds(sourceId?: string): string[] {
  const sources = getDb().prepare('SELECT id, path FROM sources').all() as {
    id: string;
    path: string;
  }[];
  const out: string[] = [];
  for (const s of sources) {
    if ((sourceId && s.id !== sourceId) || !fs.existsSync(s.path)) continue;
    for (const e of fs.readdirSync(s.path, { withFileTypes: true })) {
      if (e.isDirectory() && fs.existsSync(path.join(s.path, e.name, EMAIL_FILE)))
        out.push(toEmailId(s.id, e.name));
    }
  }
  return out;
}

function buildFilePatch(input: Input): Partial<EmailFile> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(FIELD_MAP)) {
    if (input[key] !== undefined) out[field] = input[key];
  }
  if (input.totpEnabled === false) out.totp = null;
  if (input.status === 'active') out.status_note = null;
  return out as Partial<EmailFile>;
}

function listEmails(sourceId?: string) {
  const items: ReturnType<typeof mapEmail>[] = [];
  for (const id of listIds(sourceId)) {
    const data = readFile(id);
    if (data) items.push(mapEmail(id, data));
  }
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function getEmailById(id: string) {
  const data = readFile(id);
  return data ? mapEmail(id, data) : null;
}

function createEmail(input: Input): string {
  const email = String(input.email).trim();
  const scope = input.sourceId ? String(input.sourceId) : undefined;
  if (listIds(scope).some((id) => readFile(id)?.email?.toLowerCase() === email.toLowerCase())) {
    throw new AppError('email already exists', 409);
  }
  const folder = String(input.chromeProfile ?? '').trim();
  if (!input.sourceId || !folder)
    throw new AppError('sourceId and chromeProfile are required', 400);
  const id = toEmailId(String(input.sourceId), folder);
  const now = new Date().toISOString();
  writeFile(id, {
    email,
    display_name: email.split('@')[0],
    avatar_hue: Math.floor(Math.random() * 360),
    avatar_url: null,
    recovery_email: null,
    phone_number: null,
    totp: null,
    backup_codes: [],
    created_at: now,
    updated_at: now,
    ...buildFilePatch(input),
    ...{ email },
  });
  return id;
}

export const emailRepository = {
  list: listEmails,
  listIdsBySource: listIds,
  getById: getEmailById,
  getRaw: (id: string): EmailFile | undefined => readFile(id) ?? undefined,
  exists: (id: string): boolean => fs.existsSync(fileOf(id)),
  create: createEmail,
  update: (id: string, input: Input): boolean => {
    const data = readFile(id);
    if (!data) return false;
    writeFile(id, { ...data, ...buildFilePatch(input), updated_at: new Date().toISOString() });
    return true;
  },
  remove: (id: string): boolean => {
    if (!fs.existsSync(fileOf(id))) return false;
    fs.rmSync(fileOf(id), { force: true });
    return true;
  },
};
