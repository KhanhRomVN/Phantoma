import express, { Router } from 'express';
import { searchService } from '../services/search/search.service';
import { requireString, safePath } from '../http/guard';
import { handle, json } from '../http/envelope';
import { queryBool } from '../http/params';
import { openSse } from '../http/sse';

export function registerSearchRoutes(): Router {
  const router = express.Router();

  router.get(
    '/search/stream',
    handle((req, res) => {
      const searchId = requireString(req.query.searchId, 'searchId');
      const projectPath = safePath(req.query.projectPath, 'projectPath', { withinProject: true });
      const query = requireString(req.query.query, 'query');
      const caseSensitive = queryBool(req.query.caseSensitive);
      const wholeWord = queryBool(req.query.wholeWord);
      const isRegex = queryBool(req.query.isRegex);
      const includePattern = (req.query.includePattern as string | undefined) || undefined;
      const excludePattern = (req.query.excludePattern as string | undefined) || undefined;

      const sse = openSse(res);

      searchService.search(
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
        searchService.cancel(searchId);
      });
    }),
  );

  router.post(
    '/search/cancel',
    handle((req, res) => {
      const searchId = requireString(req.body?.searchId, 'searchId');
      searchService.cancel(searchId);
      json(res, 200, { cancelled: true });
    }),
  );

  return router;
}