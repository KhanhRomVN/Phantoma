import { Request, Response } from 'express';
import type { SessionService } from '../../application/services/sessions/session.service';
import { param } from '../http/params';
import { json } from '../http/envelope';

export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  list = (_req: Request, res: Response): void => json(res, 200, this.sessionService.list());

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.sessionService.create(req.body ?? {}));
  };

  get = (req: Request, res: Response): void => json(res, 200, this.sessionService.get(param(req.params.id)));

  update = (req: Request, res: Response): void =>
    json(res, 200, this.sessionService.update(param(req.params.id), req.body ?? {}));

  saveWorkspace = (req: Request, res: Response): void =>
    json(res, 200, this.sessionService.saveWorkspace(param(req.params.id), req.body ?? {}));

  remove = (req: Request, res: Response): void => json(res, 200, this.sessionService.remove(param(req.params.id)));
}