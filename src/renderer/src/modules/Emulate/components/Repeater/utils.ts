import { FuzzerJob } from './types';

const STORAGE_KEY = 'systema-fuzzer-jobs';

export const loadJobs = (): FuzzerJob[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveJobs = (jobs: FuzzerJob[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

export const EMPTY_JOB: Omit<FuzzerJob, 'id' | 'createdAt'> = {
  name: '',
  description: '',
  method: 'GET',
  urlTemplate: 'https://example.com/api/user/§id§',
  headersTemplate: 'Content-Type: application/json',
  bodyTemplate: '',
  payloadType: 'numbers',
  payloadList: '',
  numberFrom: 1,
  numberTo: 100,
  numberStep: 1,
  bruteChars: 'abcdefghijklmnopqrstuvwxyz0123456789',
  bruteLen: 4,
  concurrency: 5,
  requestId: undefined,
};

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

export function applyPayload(t: string, p: string) {
  return t.replace(/§[^§]*§/g, p);
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
