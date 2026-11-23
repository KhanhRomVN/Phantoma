/**
 * ------------------------------------------------------------------
 * Network Util
 * ------------------------------------------------------------------
 * - HTTPS: request (theo redirect), fetchText, downloadFile
 * - TCP: đo độ trễ handshake (không cần quyền raw-socket như ICMP ping)
 * - Địa chỉ: nhận diện wildcard / loopback
 * ------------------------------------------------------------------
 */

import fs from 'fs';
import https from 'https';
import net from 'net';
import type { IncomingMessage } from 'http';
import { pipeline } from 'stream/promises';

// ─── HTTPS ──────────────────────────────────────────────────────────────

export function httpsRequest(
  url: string,
  opts: { redirects?: number; timeoutMs?: number } = {},
): Promise<IncomingMessage> {
  const { redirects = 5, timeoutMs } = opts;
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects <= 0) return reject(new Error('Too many redirects'));
          return resolve(
            httpsRequest(new URL(res.headers.location, url).href, {
              redirects: redirects - 1,
              timeoutMs,
            }),
          );
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${status}`));
        }
        resolve(res);
      })
      .on('error', reject);
    if (timeoutMs) req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
  });
}

export async function fetchText(url: string, timeoutMs?: number): Promise<string> {
  const res = await httpsRequest(url, { timeoutMs });
  res.setEncoding('utf8');
  let data = '';
  for await (const chunk of res) data += chunk;
  return data;
}

export async function downloadFile(
  url: string,
  dest: string,
  onProgress: (ratio: number) => void,
): Promise<void> {
  const res = await httpsRequest(url);
  const total = Number(res.headers['content-length']) || 0;
  let received = 0;
  res.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (total) onProgress(received / total);
  });
  await pipeline(res, fs.createWriteStream(dest));
}

// ─── TCP latency ────────────────────────────────────────────────────────

/** Đo thời gian TCP handshake tới host:port (ms); `null` nếu timeout/lỗi. */
export function tcpLatency(host: string, port: number, timeoutMs = 2_000): Promise<number | null> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const socket = net.connect({ host, port });
    const done = (value: number | null): void => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(Number(process.hrtime.bigint() - started) / 1e6));
    socket.once('timeout', () => done(null));
    socket.once('error', () => done(null));
  });
}

// ─── Address ────────────────────────────────────────────────────────────

const WILDCARD_ADDRESSES = new Set(['0.0.0.0', '::', '*', '[::]']);

export const isWildcardAddress = (addr: string): boolean => WILDCARD_ADDRESSES.has(addr);

export const isLoopbackAddress = (addr: string): boolean =>
  addr === '::1' || addr === 'localhost' || addr.startsWith('127.') || addr === '::ffff:127.0.0.1';
