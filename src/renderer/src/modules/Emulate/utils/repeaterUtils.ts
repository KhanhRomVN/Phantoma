/**
 * Tiện ích cho Repeater — sinh payload, parse header, đếm payload.
 */
import { FuzzerJob } from '../types/repeater.types';

export function* generatePayloads(job: FuzzerJob): Generator<string> {
  if (job.payloadType === 'list') {
    for (const line of job.payloadList.split('\n')) {
      const p = line.trim();
      if (p) yield p;
    }
  } else if (job.payloadType === 'numbers') {
    for (let i = job.numberFrom; i <= job.numberTo; i += job.numberStep) yield String(i);
  } else {
    const chars = job.bruteChars;
    const len = job.bruteLen;
    const total = Math.pow(chars.length, len);
    for (let i = 0; i < total; i++) {
      let n = i,
        word = '';
      for (let j = 0; j < len; j++) {
        word = chars[n % chars.length] + word;
        n = Math.floor(n / chars.length);
      }
      yield word;
    }
  }
}

export function applyPayload(template: string, payload: string) {
  return template.replace(/§[^§]*§/g, payload);
}

export function parseHeaders(text: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return h;
}

export function countPayloads(job: FuzzerJob) {
  if (job.payloadType === 'list') return job.payloadList.split('\n').filter((l) => l.trim()).length;
  if (job.payloadType === 'numbers')
    return Math.max(0, Math.floor((job.numberTo - job.numberFrom) / job.numberStep) + 1);
  return Math.pow(job.bruteChars.length, job.bruteLen);
}