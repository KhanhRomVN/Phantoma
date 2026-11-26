import type { Input } from '../database/sql';
import { mapSource } from '../domain/mappers';
import { sourceRepository } from '../repositories/source.repository';
import { AppError, found, newId, requireString } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('SourceService');

const DEFAULT_SOURCE_NAME = 'Default';

function cleanFields(input: Input, creating: boolean): Input {
  const out: Input = {};
  if (creating || input.name !== undefined) out.name = requireString(input.name, 'name').trim();
  if (input.websiteUrl !== undefined) {
    const url = String(input.websiteUrl ?? '').trim();
    out.websiteUrl = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url; // ASSUMED: a bare domain is stored as https://<domain>
  }
  return out;
}

function assertNameFree(name: string, selfId?: string): void {
  const dup = sourceRepository.findByName(name);
  if (dup && dup.id !== selfId) throw new AppError(`source "${name}" already exists`, 409);
}

export const sourceService = {
  // A fresh install gets one empty source so proxies always have somewhere to live
  ensureDefault: (): void => {
    if (sourceRepository.list().some((s) => s.type === 'normal')) return;
    sourceRepository.insert(newId(), { name: DEFAULT_SOURCE_NAME });
  },

  list: () => sourceRepository.list().map(mapSource),

  get: (id: string) => mapSource(found(sourceRepository.get(id), 'source')),

  // type is never client-controlled: sources created here are always normal
  create: (input: Input) => {
    const data = cleanFields(input, true);
    assertNameFree(data.name);
    const id = newId();
    sourceRepository.insert(id, data);
    return sourceService.get(id);
  },

  update: (id: string, input: Input) => {
    const row = found(sourceRepository.getPlain(id), 'source');
    const data = cleanFields(input, false);
    if (data.name !== undefined && row.type === 'vpn' && data.name !== row.name) {
      throw new AppError('a vpn source is built in and cannot be renamed', 409);
    }
    if (data.name !== undefined) assertNameFree(data.name, id);
    sourceRepository.update(id, data);
    return sourceService.get(id);
  },

  // proxies and accounts are removed with the source (ON DELETE CASCADE)
  remove: (id: string): void => {
    const row = found(sourceRepository.getPlain(id), 'source');
    if (row.type === 'vpn')
      throw new AppError(`the ${row.name} source is built in and cannot be removed`, 409);
    if (!sourceRepository.remove(id)) throw new AppError('source not found', 404);
  },
};
