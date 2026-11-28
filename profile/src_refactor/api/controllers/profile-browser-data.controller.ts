import type { Request, Response } from 'express';
import type { ProfileBrowserDataService } from '../../application/services/browser-data/profile-browser-data.service';
import type { ProfileService } from '../../application/services/profiles/profile.service';
import { param } from '../../utils/guard';
import { AppError, json, requireString } from '../../utils/http';

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface ProfileBrowserDataControllerDeps {
  profileService: ProfileService;
  browserData: ProfileBrowserDataService;
}

export class ProfileBrowserDataController {
  constructor(private readonly deps: ProfileBrowserDataControllerDeps) {}

  private async requireProfile(id: string): Promise<string> {
    await this.deps.profileService.get(id);
    return id;
  }

  private kind(req: Request) {
    return this.deps.browserData.parseBrowserKind(req.query.browser);
  }

  listExecutables = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.browserData.listExecutables());
  };

  deviceFingerprint = async (_req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.browserData.getDeviceFingerprint());
  };

  folderInfo = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.browserData.getFolderInfo(await this.requireProfile(param(req.params.id))));
  };

  avatar = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    json(res, 200, { avatar: this.deps.browserData.readAvatar(id, this.kind(req)) });
  };

  googleLogin = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    json(res, 200, this.deps.browserData.checkGoogleLogin(id, this.kind(req)));
  };

  domainSession = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    const domain = requireString(req.query.domain, 'domain');
    json(res, 200, this.deps.browserData.checkDomainSession(id, this.kind(req), domain));
  };

  savedLogins = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    json(res, 200, this.deps.browserData.listSavedLogins(id, this.kind(req)));
  };

  extensionState = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    json(res, 200, this.deps.browserData.readExtensionState(id, this.kind(req)));
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    const date = typeof req.query.date === 'string' ? new Date(req.query.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new AppError('invalid date', 400);
    const from = startOfDay(date);
    json(res, 200, this.deps.browserData.readHistory(id, from, from + 24 * 60 * 60 * 1000));
  };

  passwordReuse = async (req: Request, res: Response): Promise<void> => {
    const password = requireString(req.body?.password, 'password');
    const ids = (await this.deps.profileService.list()).map((p: { id: string }) => p.id);
    json(res, 200, { count: this.deps.browserData.countPasswordReuse(ids, password) });
  };

  listPasswords = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.browserData.passwords.list(await this.requireProfile(param(req.params.id))));
  };

  addPassword = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    const url = requireString(req.body?.url, 'url');
    const password = requireString(req.body?.password, 'password');
    json(res, 201, this.deps.browserData.passwords.add(id, { url, username: req.body?.username, password }));
  };

  updatePassword = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    const url = requireString(req.body?.url, 'url');
    const password = requireString(req.body?.password, 'password');
    const ok = this.deps.browserData.passwords.update(id, param(req.params.passwordId), {
      url,
      username: req.body?.username,
      password,
    });
    if (!ok) throw new AppError('password not found', 404);
    json(res, 200, { updated: true });
  };

  removePassword = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    if (!this.deps.browserData.passwords.remove(id, param(req.params.passwordId))) {
      throw new AppError('password not found', 404);
    }
    json(res, 200, { deleted: true });
  };

  listFingerprintHistory = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.browserData.fingerprintHistory.list(await this.requireProfile(param(req.params.id))));
  };

  removeFingerprintHistory = async (req: Request, res: Response): Promise<void> => {
    const id = await this.requireProfile(param(req.params.id));
    if (!this.deps.browserData.fingerprintHistory.remove(id, param(req.params.entryId))) {
      throw new AppError('fingerprint history entry not found', 404);
    }
    json(res, 200, { deleted: true });
  };
}