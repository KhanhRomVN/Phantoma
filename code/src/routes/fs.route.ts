import express, { Router } from 'express';
import { fsService } from '../services/fs/fs-write.service';
import { fsReadService } from '../services/fs/fs-query.service';
import { imageService } from '../services/fs/image.service';
import { requireString, safePath } from '../http/guard';
import { handle, json } from '../http/envelope';
import { queryBool, queryCsv } from '../http/params';

export function registerFsRoutes(): Router {
  const router = express.Router();

  router.get(
    '/fs/list-dir',
    handle(async (req, res) => {
      json(res, 200, await fsService.listDir(safePath(req.query.path, 'path')));
    }),
  );

  router.post(
    '/fs/write-file',
    handle(async (req, res) => {
      const filePath = safePath(req.body?.path, 'path', {
        write: true,
        withinProject: true,
        allowSensitive: req.body?.allowSensitive === true,
      });
      json(res, 200, await fsService.writeFile(filePath, req.body?.content ?? ''));
    }),
  );

  router.post(
    '/fs/mkdir',
    handle(async (req, res) => {
      json(res, 200, await fsService.mkdir(safePath(req.body?.path, 'path', { write: true })));
    }),
  );

  router.post(
    '/fs/rename',
    handle(async (req, res) => {
      const oldPath = safePath(req.body?.oldPath, 'oldPath', { write: true, withinProject: true });
      const newPath = safePath(req.body?.newPath, 'newPath', { write: true, withinProject: true });
      json(res, 200, await fsService.rename(oldPath, newPath));
    }),
  );

  router.post(
    '/fs/copy',
    handle(async (req, res) => {
      const src = safePath(req.body?.src, 'src', { withinProject: true });
      const dest = safePath(req.body?.dest, 'dest', { write: true, withinProject: true });
      json(res, 200, await fsService.copy(src, dest));
    }),
  );

  router.delete(
    '/fs/delete-file',
    handle(async (req, res) => {
      const filePath = safePath(req.query.path, 'path', { write: true, withinProject: true });
      json(res, 200, await fsService.deleteFile(filePath));
    }),
  );

  router.delete(
    '/fs/remove-dir',
    handle(async (req, res) => {
      const dirPath = safePath(req.query.path, 'path', { write: true, withinProject: true });
      json(res, 200, await fsService.removeDir(dirPath));
    }),
  );

  router.get(
    '/fs/read-file',
    handle(async (req, res) => {
      const trusted = queryBool(req.query.trusted);
      const filePath = safePath(req.query.path, 'path', { withinProject: !trusted, allowSensitive: trusted });
      const start = req.query.start === undefined ? undefined : Number(req.query.start);
      const end = req.query.end === undefined ? undefined : Number(req.query.end);
      json(res, 200, await fsReadService.read(filePath, { start, end }));
    }),
  );

  router.get(
    '/fs/stat',
    handle(async (req, res) => {
      const trusted = queryBool(req.query.trusted);
      const filePath = safePath(req.query.path, 'path', { withinProject: !trusted, allowSensitive: trusted });
      json(res, 200, await fsReadService.stat(filePath));
    }),
  );

  router.get(
    '/fs/tree',
    handle(async (req, res) => {
      const dirPath = safePath(req.query.path, 'path', { withinProject: true });
      const exclude = queryCsv(req.query.exclude);
      json(
        res,
        200,
        await fsReadService.tree(dirPath, {
          depth: Number(req.query.depth) || 1,
          exclude,
          hidden: req.query.hidden !== 'false',
        }),
      );
    }),
  );

  router.get(
    '/fs/find-files',
    handle(async (req, res) => {
      const root = safePath(req.query.root, 'root', { withinProject: true });
      const pattern = requireString(req.query.pattern, 'pattern');
      const exclude = queryCsv(req.query.exclude);
      const max = Number(req.query.max) || undefined;
      json(res, 200, await fsReadService.findFiles(root, pattern, { max, exclude }));
    }),
  );

  router.post(
    '/fs/grep',
    handle(async (req, res) => {
      const target = (value: unknown, field: string): string | undefined =>
        value ? safePath(value, field, { withinProject: true }) : undefined;
      const exclude = Array.isArray(req.body?.exclude)
        ? (req.body.exclude as unknown[]).filter((s): s is string => typeof s === 'string')
        : [];
      json(
        res,
        200,
        await fsReadService.grep(requireString(req.body?.searchTerm, 'searchTerm'), {
          filePath: target(req.body?.filePath, 'filePath'),
          folderPath: target(req.body?.folderPath, 'folderPath'),
          maxFiles: Number(req.body?.maxFiles) || undefined,
          maxFileSize: Number(req.body?.maxFileSize) || undefined,
          exclude,
        }),
      );
    }),
  );

  router.get(
    '/fs/list-project-files',
    handle(async (req, res) => {
      json(res, 200, await fsReadService.listProjectFiles(safePath(req.query.root, 'root', { withinProject: true })));
    }),
  );

  router.get(
    '/fs/scan-square-images',
    handle(async (req, res) => {
      const root = safePath(req.query.root, 'root');
      json(res, 200, await imageService.scanSquareImages(root).catch(() => []));
    }),
  );

  router.get(
    '/fs/image',
    handle(async (req, res) => {
      json(res, 200, await imageService.readImageDataUrl(safePath(req.query.path, 'path')));
    }),
  );


  return router;
}