import type { Request, Response } from 'express';
import type { ServiceCatalogService } from '../../application/services/service-catalog/service.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface ServicesControllerDeps {
  serviceService: ServiceCatalogService;
}

export class ServicesController {
  constructor(private readonly deps: ServicesControllerDeps) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.serviceService.list());
  };

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.serviceService.create(req.body ?? {}));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.serviceService.get(param(req.params.id)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.serviceService.update(param(req.params.id), req.body ?? {}));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deps.serviceService.remove(param(req.params.id));
    json(res, 200, { deleted: true });
  };
}