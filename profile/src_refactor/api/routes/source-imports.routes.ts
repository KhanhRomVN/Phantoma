import express, { Router } from 'express';
import { handle } from '../../utils/http';
import type { SourceImportsController } from '../controllers/source-imports.controller';

export function createSourceImportsRoutes(c: SourceImportsController): Router {
  const router = express.Router();

  router.post('/system/validate-folder', handle(c.validateFolder));
  router.post('/system/preview-source', handle(c.previewSource));
  router.post('/system/preview-import-folder', handle(c.previewImportFolder));
  router.post('/system/read-import-file', handle(c.readImportFile));

  return router;
}