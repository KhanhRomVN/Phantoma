import { Request, Response } from 'express';
import type { GitServices } from '../../application/services/git/git-services';
import { found, requireString } from '../../application/validation/validation';
import { PathAccessPort } from '../../application/ports/path-access.port';
import { AppError } from '../../application/errors/app.error';
import { json } from '../http/envelope';
import { queryJson } from '../http/params';


type Action = (req: Request) => Promise<unknown> | unknown;

const text = (value: unknown, field: string): string => found(value, field) as string;

const lenientJson = <T>(value: unknown, field: string): T | undefined => {
  try {
    return queryJson<T>(value, field);
  } catch {
    return undefined;
  }
};

const fileList = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((f) => typeof f !== 'string' || f.includes('\0'))) {
    throw new AppError('files must be an array of strings', 400);
  }
  return value as string[];
};

const scopeList = (value: unknown): string[] => {
  const parsed = lenientJson<unknown>(value, 'scope');
  return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
};

const wrap =
  (action: Action) =>
  async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await action(req));
  };

export class GitController {
  constructor(
    private readonly pathAccess: PathAccessPort,
    private readonly svc: GitServices,
  ) {}

  private projectRoot = (value: unknown, field: string): string =>
    this.pathAccess.safePath(value, field, { withinProject: true });
  private queryRoot = (req: Request): string => this.projectRoot(req.query.root, 'root');
  private bodyRoot = (req: Request): string => this.projectRoot(req.body?.root, 'root');

  private cloneRoots = (value: unknown): Record<string, string> => {
    const clones: Record<string, string> = {};
    const raw = lenientJson<Record<string, string>>(value, 'clones');
    if (!raw || typeof raw !== 'object') return clones;
    for (const [name, p] of Object.entries(raw)) {
      try {
        clones[name] = this.projectRoot(p, 'clones');
      } catch {
        continue;
      }
    }
    return clones;
  };

  status = wrap((req) => this.svc.status.status(this.projectRoot(req.query.gitRoot, 'gitRoot')));
  ignoredPaths = wrap((req) => this.svc.status.ignoredPaths(this.projectRoot(req.query.gitRoot, 'gitRoot')));
  explorerState = wrap((req) =>
    this.svc.explorer.state(this.queryRoot(req), scopeList(req.query.scope), req.query.active === '1'),
  );
  changedInOtherBranches = wrap((req) => this.svc.status.changedInOtherBranches(this.queryRoot(req)));
  remoteDiff = wrap((req) => {
    const root = this.queryRoot(req);
    return this.svc.status.remoteDiff(root, found(req.query.remoteHash, 'remoteHash') as string);
  });
  diffVsDefault = wrap((req) => this.svc.explorer.diffVsDefault(this.queryRoot(req)));
  defaultBranch = wrap((req) => this.svc.defaultBranchName(this.queryRoot(req)));
  fetch = wrap((req) => this.svc.remote.fetch(this.bodyRoot(req)));
  fileDiffVsRemote = wrap((req) => {
    const root = this.queryRoot(req);
    return this.svc.remote.fileDiffVsRemote(root, this.projectRoot(req.query.filePath, 'filePath'));
  });
  commitPushFiles = wrap((req) => {
    const root = this.bodyRoot(req);
    const files = (req.body?.files ?? []) as string[];
    const message = (req.body?.message ?? '') as string;
    return this.svc.remote.commitPushFiles(root, files, message);
  });
  push = wrap((req) => this.svc.remote.push(this.bodyRoot(req)));
  publishBranch = wrap((req) => this.svc.branch.publishBranch(this.bodyRoot(req)));

  stagedDiff = wrap((req) => this.svc.read.stagedDiff(this.queryRoot(req)));
  unpushed = wrap((req) => this.svc.read.unpushed(this.queryRoot(req)));
  log = wrap((req) => {
    const limit = Number(req.query.limit) || undefined;
    const ref = typeof req.query.ref === 'string' && req.query.ref ? req.query.ref : undefined;
    return this.svc.read.log(this.queryRoot(req), limit, ref);
  });
  branches = wrap((req) => this.svc.branch.listBranches(this.queryRoot(req)));
  tags = wrap((req) => this.svc.read.listTags(this.queryRoot(req)));
  resolveRef = wrap((req) => this.svc.read.resolveRef(this.queryRoot(req), text(req.query.ref, 'ref')));
  isRepo = wrap((req) => this.svc.read.isRepo(this.pathAccess.safePath(req.query.root, 'root')));
  repoIdentity = wrap((req) => this.svc.read.repoIdentity(this.pathAccess.safePath(req.query.root, 'root')));
  commitDiff = wrap((req) => this.svc.read.commitDiff(this.queryRoot(req), text(req.query.hash, 'hash')));
  localDiff = wrap((req) =>
    this.svc.read.localDiff(
      this.queryRoot(req),
      text(req.query.branch, 'branch'),
      req.query.branchRoot ? this.projectRoot(req.query.branchRoot, 'branchRoot') : undefined,
    ),
  );
  commitBody = wrap((req) => this.svc.read.commitBody(this.queryRoot(req), text(req.query.hash, 'hash')));
  commitFiles = wrap((req) => this.svc.read.commitFiles(this.queryRoot(req), text(req.query.hash, 'hash')));
  exportCommit = wrap((req) =>
    this.svc.export.exportCommit(
      this.bodyRoot(req),
      requireString(req.body?.hash, 'hash'),
      fileList(req.body?.paths),
      this.pathAccess.safePath(req.body?.dest, 'dest', { write: true }),
    ),
  );
  commitTree = wrap((req) => this.svc.read.commitTree(this.queryRoot(req), text(req.query.hash, 'hash')));
  commitFileContent = wrap((req) =>
    this.svc.read.commitFileContent(this.queryRoot(req), text(req.query.hash, 'hash'), text(req.query.filePath, 'filePath')),
  );
  remoteUrl = wrap((req) => this.svc.read.remoteUrl(this.queryRoot(req)));
  localChanges = wrap((req) => this.svc.read.localChanges(this.queryRoot(req), this.cloneRoots(req.query.clones)));
  fileDiff = wrap((req) => this.svc.read.fileDiff(this.queryRoot(req), text(req.query.filePath, 'filePath')));
  languageStats = wrap((req) => this.svc.read.languageStats(this.pathAccess.safePath(req.query.root, 'root')));
  repoInfo = wrap((req) => this.svc.read.repoInfo(this.pathAccess.safePath(req.query.root, 'root')));

  checkout = wrap((req) => this.svc.write.checkout(this.bodyRoot(req), requireString(req.body?.branch, 'branch')));
  commit = wrap((req) => this.svc.write.commit(this.bodyRoot(req), requireString(req.body?.message, 'message')));
  stage = wrap((req) => this.svc.write.stage(this.bodyRoot(req), fileList(req.body?.files)));
  scopeTransfer = wrap((req) =>
    this.svc.write.scopeTransfer(
      this.bodyRoot(req),
      this.projectRoot(req.body?.targetRoot, 'targetRoot'),
      fileList(req.body?.files),
    ),
  );
  stageAll = wrap((req) => this.svc.write.stageAll(this.bodyRoot(req)));
  unstage = wrap((req) => this.svc.write.unstage(this.bodyRoot(req), fileList(req.body?.files)));
  unstageAll = wrap((req) => this.svc.write.unstageAll(this.bodyRoot(req)));
  pruneOrphanBranches = wrap((req) => this.svc.branch.pruneOrphanBranches(this.bodyRoot(req)));
  clone = wrap((req) => {
    const url = requireString(req.body?.url, 'url');
    const dest = this.pathAccess.safePath(req.body?.dest, 'dest', { write: true });
    const branch = typeof req.body?.branch === 'string' && req.body.branch ? req.body.branch : undefined;
    return this.svc.write.clone(url, dest, branch);
  });
  protectStatus = wrap((req) => this.svc.protect.protectStatus(this.queryRoot(req)));
  protectEnable = wrap((req) => this.svc.protect.protectEnable(this.bodyRoot(req)));
  protectDisable = wrap((req) => this.svc.protect.protectDisable(this.bodyRoot(req)));
  checkReady = wrap((req) => this.svc.write.checkReady(this.queryRoot(req)));
}