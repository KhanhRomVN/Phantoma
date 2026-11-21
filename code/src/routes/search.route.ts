import express, { Router } from 'express';
import { searchService } from '../services/search.service';
import { found } from '../utils/guard';
import { handle } from '../utils/http';

export function registerSearchRoutes(): Router {
  const router = express.Router();

  // SSE endpoint for streaming search results
  router.get(
    '/search/stream',
    handle((req, res) => {
      const searchId = found(req.query.searchId, 'searchId') as string;
      const projectPath = found(req.query.projectPath, 'projectPath') as string;
      const query = found(req.query.query, 'query') as string;
      const caseSensitive = req.query.caseSensitive === 'true';
      const wholeWord = req.query.wholeWord === 'true';
      const isRegex = req.query.isRegex === 'true';
      const includePattern = (req.query.includePattern as string | undefined) || undefined;
      const excludePattern = (req.query.excludePattern as string | undefined) || undefined;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      searchService.search(
        searchId,
        projectPath,
        query,
        { caseSensitive, wholeWord, isRegex, includePattern, excludePattern },
        (results) => {
          res.write(`event: chunk\n`);
          res.write(`data: ${JSON.stringify({ searchId, results })}\n\n`);
        },
        (result) => {
          res.write(`event: done\n`);
          res.write(`data: ${JSON.stringify({ searchId, ...result })}\n\n`);
          res.end();
        },
      );

      req.on('close', () => {
        searchService.cancel(searchId);
      });
    }),
  );

  // Cancel search
  router.post(
    '/search/cancel',
    handle((req, res) => {
      const searchId = found(req.body?.searchId, 'searchId');
      searchService.cancel(searchId);
      res.json({ success: true, data: { cancelled: true } });
    }),
  );

  return router;
}