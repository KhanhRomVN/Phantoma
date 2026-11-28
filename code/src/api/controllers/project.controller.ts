import { Request, Response } from 'express';
import type { ProjectService } from '../../application/services/projects/project.service';
import type { WorktreeService } from '../../application/services/projects/worktree.service';
import type { ImageService } from '../../application/services/fs/image.service';
import { found, requireString } from '../../application/validation/validation';
import { param } from '../http/params';
import { json } from '../http/envelope';

export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly worktreeService: WorktreeService,
    private readonly images: ImageService,
  ) {}

  list = (_req: Request, res: Response): void => json(res, 200, this.projectService.list());

  create = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.projectService.create(req.body ?? {}));
  };

  saveAll = async (req: Request, res: Response): Promise<void> => {
    const list = found(Array.isArray(req.body?.projects) ? req.body.projects : null, 'projects');
    json(res, 200, await this.projectService.saveAll(list));
  };

  downloadLogo = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.images.downloadProjectLogo(requireString(req.body?.url, 'url')));
  };

  get = (req: Request, res: Response): void => json(res, 200, this.projectService.get(param(req.params.id)));

  update = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.projectService.update(param(req.params.id), req.body ?? {}));
  };

  remove = (req: Request, res: Response): void => json(res, 200, this.projectService.remove(param(req.params.id)));

  listWorktrees = (req: Request, res: Response): void =>
    json(res, 200, this.worktreeService.list(param(req.params.id)));

  createWorktree = async (req: Request, res: Response): Promise<void> => {
    json(res, 201, await this.worktreeService.create(param(req.params.id), req.body ?? {}));
  };

  getWorktree = (req: Request, res: Response): void =>
    json(res, 200, this.worktreeService.get(param(req.params.id), param(req.params.worktreeId)));

  updateWorktree = (req: Request, res: Response): void =>
    json(res, 200, this.worktreeService.update(param(req.params.id), param(req.params.worktreeId), req.body ?? {}));

  removeWorktree = (req: Request, res: Response): void =>
    json(res, 200, this.worktreeService.remove(param(req.params.id), param(req.params.worktreeId)));
}