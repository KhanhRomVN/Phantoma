import express, { Router, type Request } from 'express';
import { gitService } from '../services/git/git-status.service';
import { defaultBranchName } from '../services/git/default-branch';
import { gitRemoteService } from '../services/git/git-remote.service';
import { gitReadService } from '../services/git/git-read.service';
import { gitWriteService } from '../services/git/git-write.service';
import { gitBranchService } from '../services/git/git-branch.service';
import { gitExportService } from '../services/git/git-export.service';
import { gitProtectService } from '../services/git/git-protect.service';
import { gitExplorerService } from '../services/git/git-explorer.service';
import { found, requireString, safePath } from '../http/guard';
import { AppError, handle, json } from '../http/envelope';
import { queryJson } from '../http/params';

type Action = (req: Request) => Promise<unknown> | unknown;

const projectRoot = (value: unknown, field: string): string => safePath(value, field, { withinProject: true });
const queryRoot = (req: Request): string => projectRoot(req.query.root, 'root');
const bodyRoot = (req: Request): string => projectRoot(req.body?.root, 'root');
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

const cloneRoots = (value: unknown): Record<string, string> => {
  const clones: Record<string, string> = {};
  const raw = lenientJson<Record<string, string>>(value, 'clones');
  if (!raw || typeof raw !== 'object') return clones;
  for (const [name, p] of Object.entries(raw)) {
    try {
      clones[name] = projectRoot(p, 'clones');
    } catch {
      continue;
    }
  }
  return clones;
};

export function registerGitRoutes(): Router {
  const router = express.Router();

  const get = (path: string, action: Action): void => {
    router.get(
      path,
      handle(async (req, res) => {
        json(res, 200, await action(req));
      }),
    );
  };

  const post = (path: string, action: Action): void => {
    router.post(
      path,
      handle(async (req, res) => {
        json(res, 200, await action(req));
      }),
    );
  };

  get('/git/status', (req) => gitService.status(projectRoot(req.query.gitRoot, 'gitRoot')));
  get('/git/ignored-paths', (req) => gitService.ignoredPaths(projectRoot(req.query.gitRoot, 'gitRoot')));
  get('/git/explorer-state', (req) =>
    gitExplorerService.state(queryRoot(req), scopeList(req.query.scope), req.query.active === '1'),
  );
  get('/git/changed-in-other-branches', (req) => gitService.changedInOtherBranches(queryRoot(req)));
  get('/git/remote-diff', (req) => {
    const root = queryRoot(req);
    return gitService.remoteDiff(root, found(req.query.remoteHash, 'remoteHash') as string);
  });
  get('/git/diff-vs-default', (req) => gitExplorerService.diffVsDefault(queryRoot(req)));
  get('/git/default-branch', (req) => defaultBranchName(queryRoot(req)));
  post('/git/fetch', (req) => gitRemoteService.fetch(bodyRoot(req)));
  get('/git/file-diff-vs-remote', (req) => {
    const root = queryRoot(req);
    return gitRemoteService.fileDiffVsRemote(root, safePath(req.query.filePath, 'filePath', { withinProject: true }));
  });
  post('/git/commit-push-files', (req) => {
    const root = bodyRoot(req);
    const files = (req.body?.files ?? []) as string[];
    const message = (req.body?.message ?? '') as string;
    return gitRemoteService.commitPushFiles(root, files, message);
  });
  post('/git/push', (req) => gitRemoteService.push(bodyRoot(req)));
  post('/git/publish-branch', (req) => gitBranchService.publishBranch(bodyRoot(req)));

  get('/git/staged-diff', (req) => gitReadService.stagedDiff(queryRoot(req)));
  get('/git/unpushed', (req) => gitReadService.unpushed(queryRoot(req)));
  get('/git/log', (req) => {
    const limit = Number(req.query.limit) || undefined;
    const ref = typeof req.query.ref === 'string' && req.query.ref ? req.query.ref : undefined;
    return gitReadService.log(queryRoot(req), limit, ref);
  });
  get('/git/branches', (req) => gitBranchService.listBranches(queryRoot(req)));
  get('/git/tags', (req) => gitReadService.listTags(queryRoot(req)));
  get('/git/resolve-ref', (req) => gitReadService.resolveRef(queryRoot(req), text(req.query.ref, 'ref')));
  get('/git/is-repo', (req) => gitReadService.isRepo(safePath(req.query.root, 'root')));
  get('/git/repo-identity', (req) => gitReadService.repoIdentity(safePath(req.query.root, 'root')));
  get('/git/commit-diff', (req) => gitReadService.commitDiff(queryRoot(req), text(req.query.hash, 'hash')));
  get('/git/local-diff', (req) =>
    gitReadService.localDiff(
      queryRoot(req),
      text(req.query.branch, 'branch'),
      req.query.branchRoot ? projectRoot(req.query.branchRoot, 'branchRoot') : undefined,
    ),
  );
  get('/git/commit-body', (req) => gitReadService.commitBody(queryRoot(req), text(req.query.hash, 'hash')));
  get('/git/commit-files', (req) => gitReadService.commitFiles(queryRoot(req), text(req.query.hash, 'hash')));
  post('/git/export-commit', (req) =>
    gitExportService.exportCommit(
      bodyRoot(req),
      requireString(req.body?.hash, 'hash'),
      fileList(req.body?.paths),
      safePath(req.body?.dest, 'dest', { write: true }),
    ),
  );
  get('/git/commit-tree', (req) => gitReadService.commitTree(queryRoot(req), text(req.query.hash, 'hash')));
  get('/git/commit-file-content', (req) =>
    gitReadService.commitFileContent(queryRoot(req), text(req.query.hash, 'hash'), text(req.query.filePath, 'filePath')),
  );
  get('/git/remote-url', (req) => gitReadService.remoteUrl(queryRoot(req)));
  get('/git/local-changes', (req) => gitReadService.localChanges(queryRoot(req), cloneRoots(req.query.clones)));
  get('/git/file-diff', (req) => gitReadService.fileDiff(queryRoot(req), text(req.query.filePath, 'filePath')));
  get('/git/language-stats', (req) => gitReadService.languageStats(safePath(req.query.root, 'root')));
  get('/git/repo-info', (req) => gitReadService.repoInfo(safePath(req.query.root, 'root')));

  post('/git/checkout', (req) => gitWriteService.checkout(bodyRoot(req), requireString(req.body?.branch, 'branch')));
  post('/git/commit', (req) => gitWriteService.commit(bodyRoot(req), requireString(req.body?.message, 'message')));
  post('/git/stage', (req) => gitWriteService.stage(bodyRoot(req), fileList(req.body?.files)));
  post('/git/scope-transfer', (req) =>
    gitWriteService.scopeTransfer(bodyRoot(req), projectRoot(req.body?.targetRoot, 'targetRoot'), fileList(req.body?.files)),
  );
  post('/git/stage-all', (req) => gitWriteService.stageAll(bodyRoot(req)));
  post('/git/unstage', (req) => gitWriteService.unstage(bodyRoot(req), fileList(req.body?.files)));
  post('/git/unstage-all', (req) => gitWriteService.unstageAll(bodyRoot(req)));
  post('/git/prune-orphan-branches', (req) => gitBranchService.pruneOrphanBranches(bodyRoot(req)));
  post('/git/clone', (req) => {
    const url = requireString(req.body?.url, 'url');
    const dest = safePath(req.body?.dest, 'dest', { write: true });
    const branch = typeof req.body?.branch === 'string' && req.body.branch ? req.body.branch : undefined;
    return gitWriteService.clone(url, dest, branch);
  });
  get('/git/protect-status', (req) => gitProtectService.protectStatus(queryRoot(req)));
  post('/git/protect-enable', (req) => gitProtectService.protectEnable(bodyRoot(req)));
  post('/git/protect-disable', (req) => gitProtectService.protectDisable(bodyRoot(req)));
  get('/git/check-ready', (req) => gitWriteService.checkReady(queryRoot(req)));

  return router;
}