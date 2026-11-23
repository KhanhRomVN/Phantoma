import type { Response } from 'express';

export interface SseChannel {
  send: (event: string, data: unknown) => void;
  close: () => void;
}

export function openSse(res: Response): SseChannel {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  return {
    send: (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    close: () => res.end(),
  };
}