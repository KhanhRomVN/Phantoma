import { requireFields, type Input } from '../database/sql';
import { serviceRepository } from '../repositories/service.repository';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';

export const serviceService = {
  list: async () => serviceRepository.list(),

  get: async (id: string) => found(serviceRepository.getById(id), 'service'),

  create: async (input: Input) => {
    requireFields(input, ['name']);
    return serviceRepository.create(input);
  },

  update: async (id: string, input: Input) => found(serviceRepository.update(id, input), 'service'),

  remove: async (id: string): Promise<void> => {
    if (!serviceRepository.remove(id)) throw new AppError('service not found', 404);
  },
};