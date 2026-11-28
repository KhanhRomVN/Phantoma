import type { Request, Response } from 'express';
import type { browserForkService } from '../../services/browser-fork.service';
import type { BrowserRunService } from '../../infrastructure/browser/launcher/browser-run.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface BrowserSessionsControllerDeps {
  browserRunService: BrowserRunService;
  browserForkService: typeof browserForkService;
}

export class BrowserSessionsController {
  constructor(private readonly deps: BrowserSessionsControllerDeps) {}

  running = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserRunService.list());
  };

  forks = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserForkService.list());
  };

  launch = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.browserRunService.launch(param(req.params.id), req.body ?? {}));
  };

  stop = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserRunService.stop(param(req.params.id)));
  };
}