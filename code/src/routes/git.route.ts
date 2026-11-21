import express, { Router } from 'express';
import { gitService } from '../services/git.service';
import { gitExtraService } from '../services/git-extra.service';
import { gitRemoteService } from '../services/git-remote.service';
import { gitReadService } from '../services/git-read.service';
import { gitWriteService } from '../services/git-write.service';
import { found, requireString, safePath } from '../utils/guard';
import { AppError, handle, json } from '../utils/http';

const projectRoot = (value: unknown, field: string): string => safePath(value, field, { withinProject: true });

export function registerGitRoutes(): Router {
  const router = express.Router();

  router.get(
    '/git/status',
    handle(async (req, res) => {
      json(res, 200, await gitService.status(projectRoot(req.query.gitRoot, 'gitRoot')));
    }),
  );

  router.get(
    '/git/ignored-paths',
    handle(async (req, res) => {
      json(res, 200, await gitService.ignoredPaths(projectRoot(req.query.gitRoot, 'gitRoot')));
    }),
  );

  router.get(
    '/git/changed-in-other-branches',
    handle(async (req, res) => {
      json(res, 200, await gitService.changedInOtherBranches(projectRoot(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/remote-diff',
    handle(async (req, res) => {
      const root = projectRoot(req.query.root, 'root');
      const remoteHash = found(req.query.remoteHash, 'remoteHash') as string;
      json(res, 200, await gitService.remoteDiff(root, remoteHash));
    }),
  );

  router.get(
    '/git/default-branch',
    handle(async (req, res) => {
      json(res, 200, await gitExtraService.defaultBranch(projectRoot(req.query.root, 'root')));
    }),
  );

  router.post(
    '/git/fetch',
    handle(async (req, res) => {
      json(res, 200, await gitRemoteService.fetch(projectRoot(req.body?.root, 'root')));
    }),
  );

  router.get(
    '/git/file-diff-vs-remote',
    handle(async (req, res) => {
      const root = projectRoot(req.query.root, 'root');
      const filePath = safePath(req.query.filePath, 'filePath', { withinProject: true });
      json(res, 200, await gitRemoteService.fileDiffVsRemote(root, filePath));
    }),
  );

  router.post(
    '/git/commit-push-files',
    handle(async (req, res) => {
      const root = projectRoot(req.body?.root, 'root');
      const files = (req.body?.files ?? []) as string[];
      const message = (req.body?.message ?? '') as string;
      json(res, 200, await gitRemoteService.commitPushFiles(root, files, message));
    }),
  );

  const text = (value: unknown, field: string): string => found(value, field) as string;

  router.get(
    '/git/log',
    handle(async (req, res) => {
      const limit = Number(req.query.limit) || undefined;
      const ref = typeof req.query.ref === 'string' && req.query.ref ? req.query.ref : undefined;
      json(res, 200, await gitReadService.log(projectRoot(req.query.root, 'root'), limit, ref));
    }),
  );

  router.get(
    '/git/branches',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.listBranches(projectRoot(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/tags',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.listTags(projectRoot(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/resolve-ref',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.resolveRef(projectRoot(req.query.root, 'root'), text(req.query.ref, 'ref')));
    }),
  );

  router.get(
    '/git/is-repo',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.isRepo(safePath(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/repo-identity',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.repoIdentity(safePath(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/commit-diff',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.commitDiff(projectRoot(req.query.root, 'root'), text(req.query.hash, 'hash')));
    }),
  );

  router.get(
    '/git/local-diff',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.localDiff(projectRoot(req.query.root, 'root'), text(req.query.branch, 'branch')));
    }),
  );

  router.get(
    '/git/commit-body',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.commitBody(projectRoot(req.query.root, 'root'), text(req.query.hash, 'hash')));
    }),
  );

  router.get(
    '/git/commit-files',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.commitFiles(projectRoot(req.query.root, 'root'), text(req.query.hash, 'hash')));
    }),
  );

  router.get(
    '/git/remote-url',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.remoteUrl(projectRoot(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/local-changes',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.localChanges(projectRoot(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/file-diff',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.fileDiff(projectRoot(req.query.root, 'root'), text(req.query.filePath, 'filePath')));
    }),
  );

  router.get(
    '/git/language-stats',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.languageStats(safePath(req.query.root, 'root')));
    }),
  );

  router.get(
    '/git/repo-info',
    handle(async (req, res) => {
      json(res, 200, await gitReadService.repoInfo(safePath(req.query.root, 'root')));
    }),
  );

  const fileList = (value: unknown): string[] => {
    if (!Array.isArray(value) || value.some((f) => typeof f !== 'string' || f.includes('\0'))) {
      throw new AppError('files must be an array of strings', 400);
    }
    return value as string[];
  };
  const bodyRoot = (req: express.Request): string => projectRoot(req.body?.root, 'root');

  router.post(
    '/git/checkout',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.checkout(bodyRoot(req), requireString(req.body?.branch, 'branch')));
    }),
  );

  router.post(
    '/git/commit',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.commit(bodyRoot(req), requireString(req.body?.message, 'message')));
    }),
  );

  router.post(
    '/git/stage',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.stage(bodyRoot(req), fileList(req.body?.files)));
    }),
  );

  router.post(
    '/git/stage-all',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.stageAll(bodyRoot(req)));
    }),
  );

  router.post(
    '/git/unstage',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.unstage(bodyRoot(req), fileList(req.body?.files)));
    }),
  );

  router.post(
    '/git/unstage-all',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.unstageAll(bodyRoot(req)));
    }),
  );

  router.post(
    '/git/prune-orphan-branches',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.pruneOrphanBranches(bodyRoot(req)));
    }),
  );

  router.post(
    '/git/clone',
    handle(async (req, res) => {
      const url = requireString(req.body?.url, 'url');
      const dest = safePath(req.body?.dest, 'dest', { write: true });
      const branch = typeof req.body?.branch === 'string' && req.body.branch ? req.body.branch : undefined;
      json(res, 200, await gitWriteService.clone(url, dest, branch));
    }),
  );

  router.get(
    '/git/protect-status',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.protectStatus(projectRoot(req.query.root, 'root')));
    }),
  );

  router.post(
    '/git/protect-enable',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.protectEnable(bodyRoot(req)));
    }),
  );

  router.post(
    '/git/protect-disable',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.protectDisable(bodyRoot(req)));
    }),
  );

  router.get(
    '/git/check-ready',
    handle(async (req, res) => {
      json(res, 200, await gitWriteService.checkReady(projectRoot(req.query.root, 'root')));
    }),
  );

  return router;
}