import { found } from '../../../utils/guard';
import { AppError } from '../../../utils/http';
import type { QueryInput, QueryRepositoryPort } from '../../ports/repositories/query.repository.port';

export class QueryService {
  constructor(private readonly repository: QueryRepositoryPort) {}

  list = async () => this.repository.list();

  get = async (id: string) => found(this.repository.getById(id), 'query');

  create = async (input: QueryInput) => {
    const text = input.text;
    if (text === undefined || text === null || (typeof text === 'string' && text.trim() === '')) {
      throw new AppError('text is required', 400);
    }
    return this.repository.create(input);
  };

  update = async (id: string, input: QueryInput) => found(this.repository.update(id, input), 'query');

  remove = async (id: string): Promise<void> => {
    if (!this.repository.remove(id)) throw new AppError('query not found', 404);
  };
}