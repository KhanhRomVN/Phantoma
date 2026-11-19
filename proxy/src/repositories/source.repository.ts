import { getDb } from '../database/connection';
import { buildPatch, deleteRow, getRow, insertRow, updateRow, type ColumnMap, type Input } from '../database/sql';
import type { Row } from '../domain/mappers';

const SOURCE_COLUMNS: ColumnMap = {
  name: ['name'],
  type: ['type'],
  ephemeral: ['ephemeral'],
  websiteUrl: ['website_url'],
};

const WITH_COUNT = `SELECT s.*, (SELECT COUNT(*) FROM proxies p WHERE p.source_id = s.id) AS count FROM sources s`;

export const sourceRepository = {
  list: (): Row[] => getDb().prepare(`${WITH_COUNT} ORDER BY s.created_at ASC`).all() as Row[],
  get: (id: string): Row | undefined => getDb().prepare(`${WITH_COUNT} WHERE s.id = ?`).get(id) as Row | undefined,
  getPlain: (id: string): Row | undefined => getRow('sources', id),
  findByName: (name: string): Row | undefined =>
    getDb().prepare('SELECT * FROM sources WHERE LOWER(name) = LOWER(?)').get(name) as Row | undefined,
  findVpn: (name: string): Row | undefined =>
    getDb().prepare("SELECT * FROM sources WHERE type = 'vpn' AND name = ?").get(name) as Row | undefined,
  total: (): number => (getDb().prepare('SELECT COUNT(*) AS n FROM sources').get() as { n: number }).n,
  insert: (id: string, input: Input): void => {
    const now = Date.now();
    insertRow('sources', {
      id,
      name: '',
      type: 'normal',
      ephemeral: 0,
      website_url: '',
      created_at: now,
      updated_at: now,
      ...buildPatch(input, SOURCE_COLUMNS),
    });
  },
  update: (id: string, input: Input): boolean => updateRow('sources', id, buildPatch(input, SOURCE_COLUMNS)),
  remove: (id: string): boolean => deleteRow('sources', id),
};