import { Request, Response } from 'express';
import type { SearchService } from '../../application/services/search/search.service';
import { requireString } from '../../application/validation/validation';
import { PathAccessPort } from '../../application/ports/path-access.port';
import { json } from '../http/envelope';
import { queryBool } from '../http/params';
import { openSse } from '../http/sse';

export class SearchController {
  constructor(
    private readonly pathAccess: PathAccessPort,
    private readonly searchService: SearchService,
  ) {}

  stream = (req: Request, res: Response): void => {
    const searchId = requireString(req.query.searchId, 'searchId');
    const projectPath = this.pathAccess.safePath(req.query.projectPath, 'projectPath', { withinProject: true });
    const query = requireString(req.query.query, 'query');
    const caseSensitive = queryBool(req.query.caseSensitive);
    const wholeWord = queryBool(req.query.wholeWord);
    const isRegex = queryBool(req.query.isRegex);
    const includePattern = (req.query.includePattern as string | undefined) || undefined;
    const excludePattern = (req.query.excludePattern as string | undefined) || undefined;

    const sse = openSse(res);

    this.searchService.search(
      searchId,
      projectPath,
      query,
      { caseSensitive, wholeWord, isRegex, includePattern, excludePattern },
      (results) => sse.send('chunk', { searchId, results }),
      (result) => {
        sse.send('done', { searchId, ...result });
        sse.close();
      },
    );

    req.on('close', () => {
      this.searchService.cancel(searchId);
    });
  };

  cancel = (req: Request, res: Response): void => {
    const searchId = requireString(req.body?.searchId, 'searchId');
    this.searchService.cancel(searchId);
    json(res, 200, { cancelled: true });
  };
}