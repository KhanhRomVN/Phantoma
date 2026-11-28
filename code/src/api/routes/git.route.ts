import express, { Router } from 'express';
import { GitController } from '../controllers/git.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerGitRoutes(c: GitController): Router {
  const router = express.Router();

  router.get('/git/status', handle(c.status));
  router.get('/git/ignored-paths', handle(c.ignoredPaths));
  router.get('/git/explorer-state', handle(c.explorerState));
  router.get('/git/changed-in-other-branches', handle(c.changedInOtherBranches));
  router.get('/git/remote-diff', handle(c.remoteDiff));
  router.get('/git/diff-vs-default', handle(c.diffVsDefault));
  router.get('/git/default-branch', handle(c.defaultBranch));
  router.post('/git/fetch', handle(c.fetch));
  router.get('/git/file-diff-vs-remote', handle(c.fileDiffVsRemote));
  router.post('/git/commit-push-files', handle(c.commitPushFiles));
  router.post('/git/push', handle(c.push));
  router.post('/git/publish-branch', handle(c.publishBranch));

  router.get('/git/staged-diff', handle(c.stagedDiff));
  router.get('/git/unpushed', handle(c.unpushed));
  router.get('/git/log', handle(c.log));
  router.get('/git/branches', handle(c.branches));
  router.get('/git/tags', handle(c.tags));
  router.get('/git/resolve-ref', handle(c.resolveRef));
  router.get('/git/is-repo', handle(c.isRepo));
  router.get('/git/repo-identity', handle(c.repoIdentity));
  router.get('/git/commit-diff', handle(c.commitDiff));
  router.get('/git/local-diff', handle(c.localDiff));
  router.get('/git/commit-body', handle(c.commitBody));
  router.get('/git/commit-files', handle(c.commitFiles));
  router.post('/git/export-commit', handle(c.exportCommit));
  router.get('/git/commit-tree', handle(c.commitTree));
  router.get('/git/commit-file-content', handle(c.commitFileContent));
  router.get('/git/remote-url', handle(c.remoteUrl));
  router.get('/git/local-changes', handle(c.localChanges));
  router.get('/git/file-diff', handle(c.fileDiff));
  router.get('/git/language-stats', handle(c.languageStats));
  router.get('/git/repo-info', handle(c.repoInfo));

  router.post('/git/checkout', handle(c.checkout));
  router.post('/git/commit', handle(c.commit));
  router.post('/git/stage', handle(c.stage));
  router.post('/git/scope-transfer', handle(c.scopeTransfer));
  router.post('/git/stage-all', handle(c.stageAll));
  router.post('/git/unstage', handle(c.unstage));
  router.post('/git/unstage-all', handle(c.unstageAll));
  router.post('/git/prune-orphan-branches', handle(c.pruneOrphanBranches));
  router.post('/git/clone', handle(c.clone));
  router.get('/git/protect-status', handle(c.protectStatus));
  router.post('/git/protect-enable', handle(c.protectEnable));
  router.post('/git/protect-disable', handle(c.protectDisable));
  router.get('/git/check-ready', handle(c.checkReady));

  return router;
}