import { Request, Response } from 'express';
import type { ScopeService } from '../../application/services/scopes/scope.service';
import { found } from '../../application/validation/validation';
import { param } from '../http/params';
import { json } from '../http/envelope';

export class ScopeController {
  constructor(private readonly scopeService: ScopeService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.scopeService.list(param(req.params.worktreeId)));
  };

  set = async (req: Request, res: Response): Promise<void> => {
    const paths = found(Array.isArray(req.body?.paths) ? req.body.paths : null, 'paths');
    json(res, 200, await this.scopeService.set(param(req.params.worktreeId), paths));
  };

  get = (req: Request, res: Response): void =>
    json(res, 200, this.scopeService.get(param(req.params.worktreeId), param(req.params.scopeId)));

  remove = (req: Request, res: Response): void =>
    json(res, 200, this.scopeService.remove(param(req.params.worktreeId), param(req.params.scopeId)));
}