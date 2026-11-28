import { Request, Response } from 'express';
import type { GroupService } from '../../application/services/groups/group.service';
import { param } from '../http/params';
import { json } from '../http/envelope';

export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  list = (_req: Request, res: Response): void => json(res, 200, this.groupService.list());

  create = (req: Request, res: Response): void => json(res, 201, this.groupService.create(req.body ?? {}));

  get = (req: Request, res: Response): void => json(res, 200, this.groupService.get(param(req.params.id)));

  update = (req: Request, res: Response): void =>
    json(res, 200, this.groupService.update(param(req.params.id), req.body ?? {}));

  remove = (req: Request, res: Response): void => json(res, 200, this.groupService.remove(param(req.params.id)));
}