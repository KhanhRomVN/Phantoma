import { requireFields, type Input } from '../database/sql';
import { queryRepository } from '../repositories/query.repository';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';

export const queryService = {
  list: async () => queryRepository.list(),

  get: async (id: string) => found(queryRepository.getById(id), 'query'),

  create: async (input: Input) => {
    requireFields(input, ['text']);
    return queryRepository.create(input);
  },

  update: async (id: string, input: Input) => found(queryRepository.update(id, input), 'query'),

  remove: async (id: string): Promise<void> => {
    if (!queryRepository.remove(id)) throw new AppError('query not found', 404);
  },
};