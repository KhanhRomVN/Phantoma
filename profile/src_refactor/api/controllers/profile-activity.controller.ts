import type { Request, Response } from 'express';
import type {
  BrowsingEntryService,
  ChildCrudService,
} from '../../application/services/profile-activity/profile-activity.service';
import { param } from '../../utils/guard';
import { AppError, json } from '../../utils/http';

interface ChildService {
  list: (emailId: string) => Promise<unknown>;
  get: (id: string) => Promise<unknown>;
  create: (emailId: string, input: Record<string, any>) => Promise<unknown>;
  update: (id: string, input: Record<string, any>) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
}

export interface ChildHandlers {
  list: (req: Request, res: Response) => Promise<void>;
  create: (req: Request, res: Response) => Promise<void>;
  get: (req: Request, res: Response) => Promise<void>;
  update: (req: Request, res: Response) => Promise<void>;
  remove: (req: Request, res: Response) => Promise<void>;
}

function childHandlers(service: ChildService): ChildHandlers {
  return {
    list: async (req, res) => json(res, 200, await service.list(param(req.params.profileId))),
    create: async (req, res) =>
      json(res, 201, await service.create(param(req.params.profileId), req.body ?? {})),
    get: async (req, res) => json(res, 200, await service.get(param(req.params.id))),
    update: async (req, res) =>
      json(res, 200, await service.update(param(req.params.id), req.body ?? {})),
    remove: async (req, res) => {
      await service.remove(param(req.params.id));
      json(res, 200, { deleted: true });
    },
  };
}

export interface ProfileActivityControllerDeps {
  footprintService: ChildCrudService;
  scriptRunService: ChildCrudService;
  deviceActivityService: ChildCrudService;
  browsingEntryService: BrowsingEntryService;
}

export class ProfileActivityController {
  readonly footprints: ChildHandlers;
  readonly scripts: ChildHandlers;
  readonly devices: ChildHandlers;
  readonly activity: ChildHandlers;

  constructor(private readonly deps: ProfileActivityControllerDeps) {
    this.footprints = childHandlers(deps.footprintService);
    this.scripts = childHandlers(deps.scriptRunService);
    this.devices = childHandlers(deps.deviceActivityService);
    this.activity = childHandlers(deps.browsingEntryService);
  }

  listBrowsing = async (req: Request, res: Response): Promise<void> => {
    const from = req.query.from !== undefined ? Number(req.query.from) : undefined;
    const to = req.query.to !== undefined ? Number(req.query.to) : undefined;
    if ((from !== undefined && Number.isNaN(from)) || (to !== undefined && Number.isNaN(to))) {
      throw new AppError('from/to must be unix ms timestamps', 400);
    }
    json(
      res,
      200,
      await this.deps.browsingEntryService.listInRange(param(req.params.profileId), from, to),
    );
  };

  clearBrowsing = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, {
      deleted: await this.deps.browsingEntryService.clear(param(req.params.profileId)),
    });
  };
}