import { requireFields } from '../../../database/sql';
import { found } from '../../../utils/guard';
import { AppError } from '../../../utils/http';
import type {
  ServiceCatalogRepositoryPort,
  ServiceInput,
} from '../../ports/repositories/service-catalog.repository.port';

export class ServiceCatalogService {
  constructor(private readonly repository: ServiceCatalogRepositoryPort) {}

  list = async () => this.repository.list();

  get = async (id: string) => found(this.repository.getById(id), 'service');

  create = async (input: ServiceInput) => {
    requireFields(input, ['name']);
    return this.repository.create(input);
  };

  update = async (id: string, input: ServiceInput) => found(this.repository.update(id, input), 'service');

  remove = async (id: string): Promise<void> => {
    if (!this.repository.remove(id)) throw new AppError('service not found', 404);
  };
}