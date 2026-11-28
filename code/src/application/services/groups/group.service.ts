import type { IdGeneratorPort } from '../../ports/id-generator.port';
import type { GroupRepositoryPort } from '../../ports/repositories/group.repository.port';
import { found, requireString } from '../../validation/validation';
import type { Group } from '../../../domain/group/group.types';

export interface GroupInput {
  id?: string;
  name?: string;
  iconId?: string | null;
  sortOrder?: number;
  isOpen?: boolean;
}

export class GroupService {
  constructor(
    private readonly groups: GroupRepositoryPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  list = (): Group[] => this.groups.list();

  get = (id: string) => found(this.groups.get(id), 'group');

  create = (input: GroupInput) => {
    const id = input.id ?? this.ids.newId();
    this.groups.insert({
      id,
      name: requireString(input.name, 'name'),
      iconId: input.iconId ?? null,
      sortOrder: input.sortOrder ?? 0,
      isOpen: input.isOpen ?? true,
    });
    return this.get(id);
  };

  update = (id: string, input: GroupInput) => {
    found(this.groups.get(id), 'group');
    this.groups.update(id, {
      name: input.name,
      iconId: input.iconId,
      sortOrder: input.sortOrder,
      isOpen: input.isOpen,
    });
    return this.get(id);
  };

  remove = (id: string) => {
    found(this.groups.get(id), 'group');
    const deleted = this.groups.remove(id);
    return { deleted };
  };
}