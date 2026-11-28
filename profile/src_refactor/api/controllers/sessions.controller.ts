import type { Request, Response } from 'express';
import type { SessionService } from '../../application/services/sessions/session.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface SessionsControllerDeps {
  sessionService: SessionService;
}

export class SessionsController {
  constructor(private readonly deps: SessionsControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sessionService.list(param(req.params.profileId)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sessionService.get(param(req.params.profileId), param(req.params.id)));
  };

  start = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.sessionService.start(param(req.params.profileId), req.body ?? {}));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(
      res,
      200,
      await this.deps.sessionService.update(param(req.params.profileId), param(req.params.id), req.body ?? {}),
    );
  };

  end = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sessionService.end(param(req.params.profileId), param(req.params.id)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deps.sessionService.remove(param(req.params.profileId), param(req.params.id));
    json(res, 200, { deleted: true });
  };
}