import type { Request, Response } from 'express';
import type { SourceService } from '../../application/services/sources/source.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface SourcesControllerDeps {
  sourceService: SourceService;
}

export class SourcesController {
  constructor(private readonly deps: SourcesControllerDeps) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    await this.deps.sourceService.reconcile();
    json(res, 200, await this.deps.sourceService.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.sourceService.create(req.body ?? {}));
  };

  importExisting = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.sourceService.importExisting(req.body ?? {}));
  };

  syncLocal = async (req: Request, res: Response): Promise<void> => {
    const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
    json(res, 200, await this.deps.sourceService.syncLocal(sourceId));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sourceService.get(param(req.params.id)));
  };

  sync = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sourceService.sync(param(req.params.id)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sourceService.update(param(req.params.id), req.body ?? {}));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deps.sourceService.remove(param(req.params.id));
    json(res, 200, { deleted: true });
  };
}