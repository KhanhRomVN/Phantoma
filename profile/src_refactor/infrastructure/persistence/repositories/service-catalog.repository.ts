import type {
  ServiceCatalogRepositoryPort,
  ServiceInput,
  ServiceRecord,
} from '../../../application/ports/repositories/service-catalog.repository.port';
import { buildPatch, enc, idOf, type ColumnMap } from '../../../database/sql';
import { mapService, type Row } from '../../../domain/mappers';
import { deleteRow, getRow, insertRow, updateRow, type DbProvider } from '../sqlite/main/sql-helpers';

const SERVICE_MAP: ColumnMap = {
  name: ['name'],
  url: ['website_url'],
  authMethods: ['auth_methods', enc.json],
  fields: ['custom_fields', enc.json],
  category: ['category'],
};

export class SqliteServiceCatalogRepository implements ServiceCatalogRepositoryPort {
  constructor(private readonly db: DbProvider) {}

  list = (): ServiceRecord[] =>
    (this.db().prepare('SELECT * FROM services ORDER BY name ASC').all() as Row[]).map(mapService);

  getById = (id: string): ServiceRecord | null => {
    const row = getRow(this.db(), 'services', id);
    return row ? mapService(row) : null;
  };

  create = (input: ServiceInput): ServiceRecord | null => {
    const id = idOf(input);
    insertRow(this.db(), 'services', {
      id,
      website_url: '',
      auth_methods: '[]',
      custom_fields: '[]',
      ...buildPatch(input, SERVICE_MAP),
    });
    return this.getById(id);
  };

  update = (id: string, input: ServiceInput): ServiceRecord | null =>
    updateRow(this.db(), 'services', id, buildPatch(input, SERVICE_MAP), false) ? this.getById(id) : null;

  remove = (id: string): boolean => deleteRow(this.db(), 'services', id);
}