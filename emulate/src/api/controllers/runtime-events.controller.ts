/**
 * ------------------------------------------------------------------
 * Runtime Events Controller
 * ------------------------------------------------------------------
 * Global Server-Sent Events stream for runtime (CDP) events. Matches the
 * expectation of the frontend's runtime-sse-bridge, which listens on /events.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { cdpService } from '../../services/browser/cdp.service';

const FORWARDED_EVENTS = ['cdp:request', 'cdp:response', 'cdp:finished'] as const;

export const runtimeEventsController = {
  stream(req: Request, res: Response): void {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Subscribe to all relevant events emitted by cdpService
    const listeners = FORWARDED_EVENTS.map((event) => {
      const listener = (data: unknown) => writeEvent(event, data);
      cdpService.on(event, listener);
      return { event, listener };
    });

    // Send initial heartbeat/connected message
    writeEvent('connected', { status: 'stream_open', timestamp: Date.now() });

    // Cleanup listeners when client disconnects
    req.on('close', () => {
      for (const { event, listener } of listeners) {
        cdpService.removeListener(event, listener);
      }
    });
  },
};
