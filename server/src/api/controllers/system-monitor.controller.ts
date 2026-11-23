/**
 * Controller cho các tab "Monitor" của SystemStatsModal:
 * overview, live metrics (REST + SSE), CPU, Memory, GPU, Storage, Network, Sensors.
 */

import type { AppContainer } from '../../bootstrap/container';
import {
  HISTORY_SIZE,
  SSE_HEARTBEAT_MS,
  SSE_MAX_INTERVAL_MS,
  SSE_MIN_INTERVAL_MS,
} from '../../constants';
import { sendSuccess } from '../../utils/http-response.util';
import { queryInt } from '../../utils/request.util';
import { asyncHandler } from '../middleware/async-handler.middleware';
import type { RequestHandler } from 'express';

export function createSystemMonitorController(c: AppContainer) {
  const stream: RequestHandler = (req, res) => {
    const interval = queryInt(req.query.interval, {
      fallback: SSE_MIN_INTERVAL_MS,
      min: SSE_MIN_INTERVAL_MS,
      max: SSE_MAX_INTERVAL_MS,
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    res.write('retry: 3000\n\n');
    send('history', c.systemMonitor.history(HISTORY_SIZE));

    let lastEmit = 0;
    const unsubscribe = c.systemMonitor.subscribe((sample) => {
      // tolerance 50ms để jitter của timer không làm rớt mẫu khi interval = chu kỳ lấy mẫu
      if (sample.ts - lastEmit < interval - 50) return;
      lastEmit = sample.ts;
      send('sample', sample);
    });
    const heartbeat = setInterval(() => res.write(': ping\n\n'), SSE_HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  };

  return {
    overview: asyncHandler(async (_req, res) => sendSuccess(res, await c.systemInfo.overview())),

    metrics: asyncHandler(async (_req, res) =>
      sendSuccess(res, {
        intervalMs: c.systemMonitor.intervalMs,
        sample: await c.systemMonitor.current(),
      }),
    ),

    history: asyncHandler(async (req, res) => {
      c.systemMonitor.touch();
      const limit = queryInt(req.query.limit, {
        fallback: HISTORY_SIZE,
        min: 1,
        max: HISTORY_SIZE,
      });
      sendSuccess(res, {
        intervalMs: c.systemMonitor.intervalMs,
        samples: c.systemMonitor.history(limit),
      });
    }),

    stream,

    cpu: asyncHandler(async (_req, res) => sendSuccess(res, await c.systemInfo.cpu())),
    memory: asyncHandler(async (_req, res) => sendSuccess(res, await c.systemInfo.memory())),
    gpu: asyncHandler(async (_req, res) => sendSuccess(res, await c.gpu.details())),
    storage: asyncHandler(async (_req, res) => sendSuccess(res, await c.storage.details())),
    network: asyncHandler(async (_req, res) => sendSuccess(res, await c.network.details())),
    sensors: asyncHandler(async (_req, res) => sendSuccess(res, await c.sensors.details())),
  };
}
