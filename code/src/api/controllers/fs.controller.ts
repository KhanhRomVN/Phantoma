import { Request, Response } from 'express';
import { AppError } from '../../application/errors/app.error';
import { FsQueryService } from '../../application/services/fs/fs-query.service';
import { FsWriteService } from '../../application/services/fs/fs-write.service';
import { ImageService } from '../../application/services/fs/image.service';
import { requireString } from '../../application/validation/validation';
import { json } from '../http/envelope';
import { queryBool, queryCsv } from '../http/params';

export class FsController {
  constructor(
    private readonly fsQuery: FsQueryService,
    private readonly fsWrite: FsWriteService,
    private readonly images: ImageService,
  ) {}

  listDir = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.listDir(req.query.path));
  };

  writeFile = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.writeFile(req.body?.path, req.body?.content ?? '', req.body?.allowSensitive === true));
  };

  mkdir = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.mkdir(req.body?.path));
  };

  rename = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.rename(req.body?.oldPath, req.body?.newPath));
  };

  copy = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.copy(req.body?.src, req.body?.dest));
  };

  deleteFile = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.deleteFile(req.query.path));
  };

  removeDir = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsWrite.removeDir(req.query.path));
  };

  readFile = async (req: Request, res: Response): Promise<void> => {
    const trusted = queryBool(req.query.trusted);
    const start = req.query.start ? Number(req.query.start) : undefined;
    const end = req.query.end ? Number(req.query.end) : undefined;
    if (start !== undefined && end !== undefined) {
      json(res, 200, await this.fsQuery.readLines(req.query.path, start, end, trusted));
    } else {
      json(res, 200, await this.fsQuery.readFile(req.query.path, trusted));
    }
  };

  readLines = async (req: Request, res: Response): Promise<void> => {
    const trusted = queryBool(req.query.trusted);
    const start = Number(req.query.start);
    const end = req.query.end === undefined ? undefined : Number(req.query.end);
    json(res, 200, await this.fsQuery.readLines(req.query.path, start, end, trusted));
  };

  read = async (req: Request, res: Response): Promise<void> => {
    const trusted = queryBool(req.query.trusted);
    const start = req.query.start === undefined ? undefined : Number(req.query.start);
    const end = req.query.end === undefined ? undefined : Number(req.query.end);
    json(res, 200, await this.fsQuery.read(req.query.path, { start, end }, trusted));
  };

  stat = async (req: Request, res: Response): Promise<void> => {
    const trusted = queryBool(req.query.trusted);
    json(res, 200, await this.fsQuery.stat(req.query.path, trusted));
  };

  tree = async (req: Request, res: Response): Promise<void> => {
    const exclude = queryCsv(req.query.exclude);
    json(
      res,
      200,
      await this.fsQuery.tree(req.query.path, {
        depth: Number(req.query.depth) || 1,
        exclude,
        hidden: req.query.hidden !== 'false',
      }),
    );
  };

  findFiles = async (req: Request, res: Response): Promise<void> => {
    const pattern = requireString(req.query.pattern, 'pattern');
    const exclude = queryCsv(req.query.exclude);
    const max = Number(req.query.max) || undefined;
    json(res, 200, await this.fsQuery.findFiles(req.query.root, pattern, { max, exclude }));
  };

  grep = async (req: Request, res: Response): Promise<void> => {
    const { searchTerm, filePath, folderPath } = req.query;
    if (!filePath && !folderPath) throw new AppError('Either filePath or folderPath is required', 400);
    if (filePath && folderPath) throw new AppError('Cannot specify both filePath and folderPath', 400);
    const path = (filePath || folderPath) as string;
    const isFolder = !!folderPath;
    json(res, 200, await this.fsQuery.grep(searchTerm as string, path, isFolder, Number(req.query.maxFiles), Number(req.query.maxFileSize), req.query.exclude as string[]));
  };

  listProjectFiles = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.fsQuery.listProjectFiles(req.query.root));
  };

  scanSquareImages = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.images.scanSquareImages(req.query.root).catch(() => []));
  };

  image = async (req: Request, res: Response): Promise<void> => {
    json(res, 200, await this.images.readImageDataUrl(req.query.path));
  };
}