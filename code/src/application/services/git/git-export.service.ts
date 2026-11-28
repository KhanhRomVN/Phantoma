import path from 'path';
import { safeRef, type GitDeps } from './git-helpers';
import { AppError } from '../../errors/app.error';

const validPath = (p: string): boolean =>
  typeof p === 'string' && !!p && !p.includes('\0') && !path.isAbsolute(p) && !p.split('/').includes('..');

export const createGitExportService = ({ processes, fileSystem }: Pick<GitDeps, 'processes' | 'fileSystem'>) => ({
  exportCommit: async (
    root: string,
    hash: string,
    paths: string[],
    dest: string,
  ): Promise<{ ok?: boolean; count?: number; error?: string }> => {
    safeRef(hash, 'hash');
    if (paths.length === 0 || paths.some((p) => !validPath(p))) throw new AppError('invalid paths', 400);
    await fileSystem.mkdirp(dest);

    return new Promise((resolve) => {
      const archive = processes.spawnStream('git', ['archive', '--format=tar', hash, '--', ...paths], { cwd: root });
      const tar = processes.spawnStream('tar', ['-x', '-C', dest]);
      let err = '';
      let archiveCode: number | null = null;
      let tarCode: number | null = null;

      const finish = () => {
        if (archiveCode === null || tarCode === null) return;
        resolve(
          archiveCode === 0 && tarCode === 0
            ? { ok: true, count: paths.length }
            : { error: err.trim() || 'export failed' },
        );
      };

      archive.stderr?.on('data', (d) => (err += d));
      tar.stderr?.on('data', (d) => (err += d));
      tar.stdin?.on('error', () => undefined);
      if (tar.stdin) archive.stdout?.pipe(tar.stdin);
      archive.on('close', (c) => {
        archiveCode = c ?? 1;
        finish();
      });
      tar.on('close', (c) => {
        tarCode = c ?? 1;
        finish();
      });
      archive.on('error', (e) => {
        err += e.message;
        archiveCode = 1;
        finish();
      });
      tar.on('error', (e) => {
        err += e.message;
        tarCode = 1;
        finish();
      });
    });
  },
});