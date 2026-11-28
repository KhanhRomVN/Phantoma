import type { Request, Response } from 'express';
import type { ProfileService } from '../../application/services/profiles/profile.service';
import type { SourceService } from '../../application/services/sources/source.service';
import { param } from '../../utils/guard';
import { AppError, json, requireString } from '../../utils/http';

const isFull = (v: unknown): boolean => v === 'true' || v === '1';

export interface ProfilesControllerDeps {
  profileService: ProfileService;
  sourceService: SourceService;
}

export class ProfilesController {
  constructor(private readonly deps: ProfilesControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const sourceId = typeof req.query.sourceId === 'string' ? req.query.sourceId : undefined;
    await this.deps.sourceService.reconcile();
    json(res, 200, await this.deps.profileService.list(sourceId, isFull(req.query.full)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.deps.profileService.create(req.body ?? {}));
  };

  createMany = async (req: Request, res: Response): Promise<void> => {
    const items = req.body?.profiles;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('profiles must be a non-empty array', 400);
    }
    json(res, 201, await this.deps.profileService.createMany(items));
  };

  removeMany = async (req: Request, res: Response): Promise<void> => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('ids must be a non-empty array', 400);
    }
    json(res, 200, { deleted: await this.deps.profileService.removeMany(ids) });
  };

  bulkUpdate = async (req: Request, res: Response): Promise<void> => {
    const { ids, where, patch } = req.body ?? {};
    const hasIds = Array.isArray(ids) && ids.length > 0;
    const hasWhere = typeof where?.group === 'string';
    if (!hasIds && !hasWhere) throw new AppError('ids or where.group is required', 400);
    if (!patch || typeof patch !== 'object') throw new AppError('patch is required', 400);
    json(res, 200, {
      updated: await this.deps.profileService.bulkUpdate({
        ids: hasIds ? ids : undefined,
        where: hasWhere ? where : undefined,
        patch,
      }),
    });
  };

  transfer = async (req: Request, res: Response): Promise<void> => {
    const { ids, targetId, mode, policy, policies } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0)
      throw new AppError('ids must be a non-empty array', 400);
    if (mode !== 'move' && mode !== 'duplicate')
      throw new AppError('mode must be move or duplicate', 400);
    json(
      res,
      200,
      await this.deps.profileService.transfer({
        ids,
        targetId: requireString(targetId, 'targetId'),
        mode,
        policy: String(policy ?? ''),
        policies: policies && typeof policies === 'object' ? policies : undefined,
      }),
    );
  };

  previewTransfer = async (req: Request, res: Response): Promise<void> => {
    const { ids, targetId } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0)
      throw new AppError('ids must be a non-empty array', 400);
    json(
      res,
      200,
      await this.deps.profileService.previewTransfer(ids, requireString(targetId, 'targetId')),
    );
  };

  get = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.profileService.get(param(req.params.id), isFull(req.query.full)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.profileService.update(param(req.params.id), req.body ?? {}));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!(await this.deps.profileService.remove(param(req.params.id))))
      throw new AppError('email not found', 404);
    json(res, 200, { deleted: true });
  };

  openFolder = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.profileService.openFolder(param(req.params.id)));
  };
}