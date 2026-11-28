import type { Request, Response } from 'express';
import type { previewImportFolder, readImportFile } from '../../services/import-preview.service';
import type { SourceService } from '../../application/services/sources/source.service';
import { json, requireString } from '../../utils/http';
import type { validateFolder } from '../../utils/system';

// ASSUMED: phase 2 injects existing util/service functions; phase 4 replaces them with infrastructure scanner/validator ports
export interface SourceImportsControllerDeps {
  sourceService: SourceService;
  validateFolder: typeof validateFolder;
  previewImportFolder: typeof previewImportFolder;
  readImportFile: typeof readImportFile;
}

export class SourceImportsController {
  constructor(private readonly deps: SourceImportsControllerDeps) {}

  validateFolder = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.validateFolder(requireString(req.body?.path, 'path')));
  };

  previewSource = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.deps.sourceService.preview({ path: requireString(req.body?.path, 'path') }));
  };

  previewImportFolder = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.previewImportFolder(requireString(req.body?.path, 'path')));
  };

  readImportFile = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, this.deps.readImportFile(requireString(req.body?.path, 'path')));
  };
}