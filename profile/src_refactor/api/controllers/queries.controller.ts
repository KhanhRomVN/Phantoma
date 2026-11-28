import type { Request, Response } from 'express';
import type { QueryService } from '../../application/services/queries/query.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface QueriesControllerDeps {
  queryService: QueryService;
}

export class QueriesController {
  constructor(private readonly deps: QueriesControllerDeps) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.queryService.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.queryService.create(req.body ?? {}));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.queryService.get(param(req.params.id)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.queryService.update(param(req.params.id), req.body ?? {}));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deps.queryService.remove(param(req.params.id));
    json(res, 200, { deleted: true });
  };
}