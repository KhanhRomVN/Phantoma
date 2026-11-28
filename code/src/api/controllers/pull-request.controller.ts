import { Request, Response } from 'express';
import type { PullRequestService } from '../../application/services/pull-request/pull-request.service';
import { PathAccessPort } from '../../application/ports/path-access.port';
import { param } from '../http/params';
import { json } from '../http/envelope';

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export class PullRequestController {
  constructor(
    private readonly pathAccess: PathAccessPort,
    private readonly prService: PullRequestService,
  ) {}

  private root = (value: unknown): string => this.pathAccess.safePath(value, 'root', { withinProject: true });

  status = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.status(this.root(req.query.root)));
  };

  loginToken = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.loginToken(this.root(req.body?.root), req.body?.token));
  };

  loginWeb = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.loginWeb(this.root(req.body?.root)));
  };

  cancelLoginWeb = (_req: Request, res: Response): void => {
    json(res, 200, this.prService.cancelLoginWeb());
  };

  list = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.list(this.root(req.query.root), text(req.query.state), Number(req.query.limit) || undefined));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { title, body, base, head, draft, push } = req.body ?? {};
    json(res, 200, await this.prService.create(this.root(req.body?.root), { title, body, base, head, draft, push }));
  };

  view = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.view(this.root(req.query.root), Number(param(req.params.number))));
  };

  diff = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.diff(this.root(req.query.root), Number(param(req.params.number))));
  };

  merge = async (req: Request, res: Response): Promise<void> => {
    const n = Number(param(req.params.number));
    json(res, 200, await this.prService.merge(this.root(req.body?.root), n, text(req.body?.method), req.body?.deleteBranch === true));
  };

  close = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.close(this.root(req.body?.root), Number(param(req.params.number)), text(req.body?.comment)));
  };

  reopen = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.reopen(this.root(req.body?.root), Number(param(req.params.number))));
  };

  ready = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.ready(this.root(req.body?.root), Number(param(req.params.number))));
  };

  comment = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.prService.comment(this.root(req.body?.root), Number(param(req.params.number)), text(req.body?.body)));
  };

  review = async (req: Request, res: Response): Promise<void> => {
    const n = Number(param(req.params.number));
    json(res, 200, await this.prService.review(this.root(req.body?.root), n, text(req.body?.action) ?? '', text(req.body?.body)));
  };
}