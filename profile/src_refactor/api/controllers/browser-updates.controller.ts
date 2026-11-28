import type { Request, Response } from 'express';
import type { BrowserUpdateService } from '../../infrastructure/browser/updater/browser-update.service';
import { param } from '../../utils/guard';
import { json } from '../../utils/http';

export interface BrowserUpdatesControllerDeps {
  browserUpdateService: BrowserUpdateService;
}

export class BrowserUpdatesController {
  constructor(private readonly deps: BrowserUpdatesControllerDeps) {}

  status = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserUpdateService.status());
  };

  check = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserUpdateService.status(true));
  };

  install = async (req: Request, res: Response): Promise<void> => {
    const version = typeof req.body?.version === 'string' ? req.body.version : undefined;
    json(res, 202, await this.deps.browserUpdateService.install(param(req.params.id), version));
  };
}