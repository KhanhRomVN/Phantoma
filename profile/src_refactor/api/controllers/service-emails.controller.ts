import type { Request, Response } from 'express';
import type { ServiceEmailService } from '../../application/services/service-emails/service-email.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface ServiceEmailsControllerDeps {
  serviceEmailService: ServiceEmailService;
}

export class ServiceEmailsController {
  constructor(private readonly deps: ServiceEmailsControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.serviceEmailService.list(param(req.params.profileId)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.serviceEmailService.create(param(req.params.profileId), req.body ?? {}));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(
      res,
      200,
      await this.deps.serviceEmailService.update(param(req.params.profileId), param(req.params.id), req.body ?? {}),
    );
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deps.serviceEmailService.remove(param(req.params.profileId), param(req.params.id));
    json(res, 200, { deleted: true });
  };
}