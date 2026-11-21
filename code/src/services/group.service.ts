import { groupRepository } from '../repositories/group.repository';
import { found, requireString } from '../utils/guard';
import { newId } from '../utils/http';
import type { Group } from '../domain/mappers';

export interface GroupInput {
  id?: string;
  name?: string;
  iconId?: string | null;
  sortOrder?: number;
  isOpen?: boolean;
}

export const groupService = {
  list: (): Group[] => groupRepository.list(),

  get: (id: string) => found(groupRepository.get(id), 'group'),

  create: (input: GroupInput) => {
    const id = input.id ?? newId();
    groupRepository.insert({
      id,
      name: requireString(input.name, 'name'),
      iconId: input.iconId ?? null,
      sortOrder: input.sortOrder ?? 0,
      isOpen: input.isOpen ?? true,
    });
    return groupService.get(id);
  },

  update: (id: string, input: GroupInput) => {
    found(groupRepository.get(id), 'group');
    groupRepository.update(id, {
      name: input.name,
      iconId: input.iconId,
      sortOrder: input.sortOrder,
      isOpen: input.isOpen,
    });
    return groupService.get(id);
  },

  remove: (id: string) => {
    found(groupRepository.get(id), 'group');
    const deleted = groupRepository.remove(id);
    return { deleted };
  },
};