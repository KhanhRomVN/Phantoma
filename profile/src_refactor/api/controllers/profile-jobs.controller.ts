import type { Request, Response } from 'express';
import type { ImportJobService } from '../../application/services/imports/import-job.service';
import type { TransferJobService } from '../../application/services/transfers/transfer-job.service';
import { param } from '../../utils/guard';
import { AppError, json, requireString } from '../../utils/http';

export interface ProfileJobsControllerDeps {
  transferJobService: TransferJobService;
  importJobService: ImportJobService;
}

export class ProfileJobsController {
  constructor(private readonly deps: ProfileJobsControllerDeps) {}

  startTransfer = async (req: Request, res: Response): Promise<void> => {
    const { ids, targetId, mode, policy, policies } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError('ids must be a non-empty array', 400);
    if (mode !== 'move' && mode !== 'duplicate') throw new AppError('mode must be move or duplicate', 400);
    json(
      res,
      202,
      this.deps.transferJobService.start({
        ids,
        targetId: requireString(targetId, 'targetId'),
        mode,
        policy: String(policy ?? ''),
        policies: policies && typeof policies === 'object' ? policies : undefined,
      }),
    );
  };

  getTransfer = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.transferJobService.get(param(req.params.id)));
  };

  cancelTransfer = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.transferJobService.cancel(param(req.params.id)));
  };

  startImport = async (req: Request, res: Response): Promise<void> => {
    const { path: folderPath, targetId, folders } = req.body ?? {};
    if (!Array.isArray(folders) || folders.length === 0) throw new AppError('folders must be a non-empty array', 400);
    json(
      res,
      202,
      this.deps.importJobService.start({
        path: requireString(folderPath, 'path'),
        targetId: requireString(targetId, 'targetId'),
        folders: folders.map(String),
      }),
    );
  };

  getImport = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.importJobService.get(param(req.params.id)));
  };

  cancelImport = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.importJobService.cancel(param(req.params.id)));
  };
}