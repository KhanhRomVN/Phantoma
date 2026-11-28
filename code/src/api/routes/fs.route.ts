import express, { Router } from 'express';
import { FsController } from '../controllers/fs.controller';
import { handle } from '../middleware/async-handler.middleware';

export function registerFsRoutes(c: FsController): Router {
  const router = express.Router();

  router.get('/fs/list-dir', handle(c.listDir));
  router.post('/fs/write-file', handle(c.writeFile));
  router.post('/fs/mkdir', handle(c.mkdir));
  router.post('/fs/rename', handle(c.rename));
  router.post('/fs/copy', handle(c.copy));
  router.delete('/fs/delete-file', handle(c.deleteFile));
  router.delete('/fs/remove-dir', handle(c.removeDir));
  router.get('/fs/read-file', handle(c.readFile));
  router.get('/fs/stat', handle(c.stat));
  router.get('/fs/tree', handle(c.tree));
  router.get('/fs/find-files', handle(c.findFiles));
  router.post('/fs/grep', handle(c.grep));
  router.get('/fs/list-project-files', handle(c.listProjectFiles));
  router.get('/fs/scan-square-images', handle(c.scanSquareImages));
  router.get('/fs/image', handle(c.image));

  return router;
}