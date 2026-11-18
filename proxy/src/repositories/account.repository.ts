import { getDb } from '../database/connection';
import type { Row } from '../domain/mappers';
import { newId } from '../utils/http';

interface AccountInput {
  sourceId: string;
  email: string;
  credential: Record<string, string>;
}

function parseCredential(text: string | null | undefined): Record<string, string> {
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    return {};
  }
}

const withCredential = (r: Row): Row => ({ ...r, credential: parseCredential(r.credential) });

export const accountRepository = {
  list: (sourceId: string): Row[] =>
    (getDb().prepare('SELECT * FROM accounts WHERE source_id = ? ORDER BY created_at ASC').all(sourceId) as Row[]).map(withCredential),
  get: (id: string): Row | undefined => {
    const row = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Row | undefined;
    return row ? withCredential(row) : undefined;
  },
  insert: (data: AccountInput): string => {
    const id = newId();
    const now = Date.now();
    getDb()
      .prepare('INSERT INTO accounts (id, source_id, email, credential, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, data.sourceId, data.email, JSON.stringify(data.credential), now, now);
    return id;
  },
  update: (id: string, patch: { email?: string; credential?: Record<string, string> }): void => {
    const sets = ['updated_at = ?'];
    const values: unknown[] = [Date.now()];
    if (patch.email !== undefined) {
      sets.push('email = ?');
      values.push(patch.email);
    }
    if (patch.credential !== undefined) {
      sets.push('credential = ?');
      values.push(JSON.stringify(patch.credential));
    }
    getDb()
      .prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`)
      .run(...values, id);
  },
  upsert: (id: string, data: AccountInput): void => {
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM accounts WHERE source_id = ? AND json_extract(credential, '$.uid') = ?")
      .get(data.sourceId, data.credential.uid) as { id: string } | undefined;
    if (existing) accountRepository.update(existing.id, { email: data.email, credential: data.credential });
    else {
      const now = Date.now();
      db.prepare('INSERT INTO accounts (id, source_id, email, credential, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id,
        data.sourceId,
        data.email,
        JSON.stringify(data.credential),
        now,
        now,
      );
    }
  },
  remove: (id: string): boolean => getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id).changes > 0,
  removeBySource: (sourceId: string): number => getDb().prepare('DELETE FROM accounts WHERE source_id = ?').run(sourceId).changes,
};