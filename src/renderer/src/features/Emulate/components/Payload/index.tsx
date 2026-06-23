import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Play, Square, Plus, Trash2, Search, Zap, X, ChevronRight, ChevronDown, Send } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Intruder/Filter';
import { StatusBadge } from '../common/StatusBadge';

type PayloadType = 'list' | 'numbers' | 'brute';
type FuzzerStatus = 'idle' | 'running' | 'done' | 'stopped';

export interface FuzzerJob {
  id: string;
  name: string;
  description: string;
  method: string;
  urlTemplate: string;
  headersTemplate: string;
  bodyTemplate: string;
  payloadType: PayloadType;
  payloadList: string;
  numberFrom: number;
  numberTo: number;
  numberStep: number;
  bruteChars: string;
  bruteLen: number;
  concurrency: number;
  createdAt: number;
  requestId?: string; // Associated request ID
}

interface FuzzerResult {
  index: number;
  payload: string;
  status: number;
  time: number;
  size: number;
}

const STORAGE_KEY = 'systema-fuzzer-jobs';
const loadJobs = (): FuzzerJob[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveJobs = (jobs: FuzzerJob[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

const EMPTY_JOB: Omit<FuzzerJob, 'id' | 'createdAt'> = {
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

function* generatePayloads(job: FuzzerJob): Generator<string> {
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

function applyPayload(t: string, p: string) {
  return t.replace(/§[^§]*§/g, p);
}
function parseHeaders(text: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return h;
}
function countPayloads(job: FuzzerJob) {
  if (job.payloadType === 'list') return job.payloadList.split('\n').filter((l) => l.trim()).length;
  if (job.payloadType === 'numbers')
    return Math.max(0, Math.floor((job.numberTo - job.numberFrom) / job.numberStep) + 1);
  return Math.pow(job.bruteChars.length, job.bruteLen);
}

// ---- Request List Component ----
function RequestList({
  requests,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
}: {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!searchTerm) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter(
      (r) =>
        r.method?.toLowerCase().includes(term) ||
        r.url?.toLowerCase().includes(term) ||
        r.path?.toLowerCase().includes(term) ||
        r.host?.toLowerCase().includes(term),
    );
  }, [requests, searchTerm]);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {filtered.map((req) => {
        const isSelected = selectedId === req.id;
        const methodColor = {
          GET: 'text-emerald-400',
          POST: 'text-blue-400',
          PUT: 'text-amber-400',
          DELETE: 'text-red-400',
          PATCH: 'text-purple-400',
        }[req.method?.toUpperCase() || ''] || 'text-text-secondary';

        return (
          <div
            key={req.id}
            onClick={() => onSelect(req.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all text-xs',
              isSelected
                ? 'bg-card-background border border-border'
                : 'hover:bg-card-hover border border-transparent',
            )}
          >
            <span className={cn('font-mono font-bold w-10 shrink-0', methodColor)}>
              {req.method || 'GET'}
            </span>
            <span className="flex-1 truncate text-text-primary">{req.path || req.url}</span>
            {req.status && <StatusBadge status={req.status} />}
          </div>
        );
      })}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <p className="text-sm">No requests found</p>
          <p className="text-xs mt-1 opacity-60">Load a page to see requests</p>
        </div>
      )}
    </div>
  );
}

// ---- Payload Configuration Panel ----
function PayloadConfigPanel({
  request,
  onRun,
  isRunning,
}: {
  request: NetworkRequest | null;
  onRun: (job: Omit<FuzzerJob, 'id' | 'createdAt'>) => void;
  isRunning: boolean;
}) {
  const [form, setForm] = useState<Omit<FuzzerJob, 'id' | 'createdAt'>>(EMPTY_JOB);
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-fill from selected request
  useEffect(() => {
    if (request) {
      const url = request.url || '';
      const headers = request.requestHeaders
        ? Object.entries(request.requestHeaders)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')
        : 'Content-Type: application/json';
      const body = request.requestBody || '';
      setForm((prev) => ({
        ...prev,
        method: request.method || 'GET',
        urlTemplate: url,
        headersTemplate: headers,
        bodyTemplate: body,
        name: request.path?.split('/').pop() || 'Fuzzer Job',
      }));
    }
  }, [request]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const payloadCount = countPayloads(form as FuzzerJob);

  const handleRun = () => {
    if (!form.name.trim()) return;
    onRun(form);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex gap-2">
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Job name *"
          className="flex-1 h-9 bg-input-background border border-input-border-default rounded-lg px-3 text-sm outline-none focus:border-amber-500/50"
        />
        <select
          value={form.method}
          onChange={(e) => set('method', e.target.value)}
          className="h-9 bg-input-background border border-input-border-default rounded-lg px-2 text-sm outline-none focus:border-amber-500/50"
        >
          {methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-[10px] font-bold text-text-secondary mb-1">
          URL TEMPLATE <span className="text-amber-400">(use §payload§)</span>
        </p>
        <input
          value={form.urlTemplate}
          onChange={(e) => set('urlTemplate', e.target.value)}
          className="w-full h-9 bg-input-background border border-input-border-default rounded-lg px-3 text-sm font-mono outline-none focus:border-amber-500/50"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold text-text-secondary mb-1">HEADERS</p>
        <textarea
          value={form.headersTemplate}
          onChange={(e) => set('headersTemplate', e.target.value)}
          rows={2}
          className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono resize-none outline-none focus:border-amber-500/50"
          placeholder="Header-Name: value"
        />
      </div>

      {form.method !== 'GET' && (
        <div>
          <p className="text-[10px] font-bold text-text-secondary mb-1">BODY</p>
          <textarea
            value={form.bodyTemplate}
            onChange={(e) => set('bodyTemplate', e.target.value)}
            rows={2}
            className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono resize-none outline-none focus:border-amber-500/50"
            placeholder='{"key": "§payload§"}'
          />
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold text-text-secondary mb-1">PAYLOAD TYPE</p>
        <div className="flex gap-1.5">
          {(['list', 'numbers', 'brute'] as PayloadType[]).map((t) => (
            <button
              key={t}
              onClick={() => set('payloadType', t)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all',
                form.payloadType === t
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-muted/10 text-text-secondary border-divider hover:bg-muted/20',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {form.payloadType === 'list' && (
        <textarea
          value={form.payloadList}
          onChange={(e) => set('payloadList', e.target.value)}
          rows={5}
          placeholder="admin\nroot\ntest\n1' OR '1'='1"
          className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono resize-none outline-none focus:border-amber-500/50"
        />
      )}

      {form.payloadType === 'numbers' && (
        <div className="flex gap-2">
          {(
            [
              ['From', 'numberFrom'],
              ['To', 'numberTo'],
              ['Step', 'numberStep'],
            ] as [string, keyof Omit<FuzzerJob, 'id' | 'createdAt'>][]
          ).map(([label, key]) => (
            <div key={key} className="flex-1">
              <p className="text-[10px] text-text-secondary mb-1">{label}</p>
              <input
                type="number"
                value={form[key] as number}
                onChange={(e) => set(key, Number(e.target.value))}
                className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm outline-none focus:border-amber-500/50"
              />
            </div>
          ))}
        </div>
      )}

      {form.payloadType === 'brute' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-text-secondary mb-1">Charset</p>
            <input
              value={form.bruteChars}
              onChange={(e) => set('bruteChars', e.target.value)}
              className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-xs font-mono outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="w-20">
            <p className="text-[10px] text-text-secondary mb-1">Length</p>
            <input
              type="number"
              min={1}
              max={6}
              value={form.bruteLen}
              onChange={(e) => set('bruteLen', Number(e.target.value))}
              className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold text-text-secondary">CONCURRENCY</p>
        <input
          type="number"
          min={1}
          max={10}
          value={form.concurrency}
          onChange={(e) => set('concurrency', Number(e.target.value))}
          className="w-16 h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm outline-none focus:border-amber-500/50"
        />
        <span className="text-[10px] text-text-secondary ml-auto">
          {payloadCount.toLocaleString()} payloads
        </span>
      </div>

      <div className="pt-2 flex gap-2">
        <button
          onClick={handleRun}
          disabled={!form.name.trim() || isRunning}
          className={cn(
            'flex-1 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2',
            isRunning
              ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
          )}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4" /> Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Run Fuzzer
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---- Main PayloadPanel Component ----
interface PayloadPanelProps {
  requests?: NetworkRequest[];
  isTargetRunning?: boolean;
  onClose?: () => void;
  selectedRequestId?: string | null;
}

export function PayloadPanel({ 
  requests = [], 
  isTargetRunning = false, 
  onClose,
  selectedRequestId 
}: PayloadPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FuzzerResult[]>([]);
  const stopRef = useRef(false);

  // Get selected request
  const selectedRequest = useMemo(() => {
    if (!selectedId) return null;
    return requests.find((r) => r.id === selectedId) || null;
  }, [requests, selectedId]);

  // Auto-select: first try selectedRequestId from props, then fallback to first request
  useEffect(() => {
    if (requests.length === 0) {
      setSelectedId(null);
      return;
    }

    // If selectedRequestId is provided and exists in requests, select it
    if (selectedRequestId && requests.some((r) => r.id === selectedRequestId)) {
      setSelectedId(selectedRequestId);
      return;
    }

    // Otherwise fallback to first request
    if (!selectedId || !requests.some((r) => r.id === selectedId)) {
      setSelectedId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  // Run fuzzer
  const handleRun = async (form: Omit<FuzzerJob, 'id' | 'createdAt'>) => {
    if (isRunning) {
      stopRef.current = true;
      return;
    }

    const job: FuzzerJob = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      requestId: selectedId || undefined,
    };

    stopRef.current = false;
    setIsRunning(true);
    setResults([]);

    const payloads = [...generatePayloads(job)];
    const concurrency = Math.min(job.concurrency, 10);
    let idx = 0;

    const runOne = async (payload: string, i: number): Promise<FuzzerResult> => {
      const url = applyPayload(job.urlTemplate, payload);
      const body = applyPayload(job.bodyTemplate, payload);
      const headers = parseHeaders(applyPayload(job.headersTemplate, payload));
      const t0 = performance.now();
      try {
        const res = await (window as any).api.invoke('inspector:send-request', {
          url,
          method: job.method,
          headers,
          body: job.method !== 'GET' ? body : undefined,
        });
        return {
          index: i,
          payload,
          status: res.status ?? 0,
          time: Math.round(performance.now() - t0),
          size: res.size ?? 0,
        };
      } catch {
        return { index: i, payload, status: 0, time: Math.round(performance.now() - t0), size: 0 };
      }
    };

    while (idx < payloads.length && !stopRef.current) {
      const chunk = payloads.slice(idx, idx + concurrency);
      const chunkResults = await Promise.all(chunk.map((p, ci) => runOne(p, idx + ci)));
      setResults((prev) => [...prev, ...chunkResults]);
      idx += concurrency;
    }

    setIsRunning(false);
  };

  const totalCount = requests.length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Request List */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="px-3 py-1.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 bg-input-background border border-input-border-default rounded-md pl-8 pr-3 text-sm text-text-primary focus:border-amber-500/50 outline-none"
            />
          </div>
        </div>

        {results.length > 0 && (
          <div className="flex items-center justify-end px-3 py-1 border-b border-border shrink-0">
            <button
              onClick={() => setResults([])}
              className="text-[10px] text-text-secondary hover:text-text-primary"
            >
              Clear results
            </button>
          </div>
        )}

        <RequestList
          requests={requests}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Right Panel - Payload Configuration */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
        <div className="px-4 h-8 border-b border-border shrink-0 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-text-primary">Payload Configuration</span>
            {selectedRequest && (
              <span className="text-xs text-text-secondary ml-2 truncate max-w-[200px]">
                {selectedRequest.path || selectedRequest.url}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!selectedRequest ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <Send className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Select a request to configure payload</p>
            <p className="text-xs mt-1 opacity-60">Load a page to see requests</p>
          </div>
        ) : (
          <PayloadConfigPanel
            request={selectedRequest}
            onRun={handleRun}
            isRunning={isRunning}
          />
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="border-t border-border shrink-0 bg-muted/5 max-h-40 overflow-y-auto">
            <div className="px-3 py-1.5 border-b border-border flex items-center gap-3">
              <span className="text-[10px] font-medium text-text-secondary">
                Results: {results.length} requests
              </span>
              <span className="text-[10px] text-text-secondary">
                {results.filter((r) => r.status >= 200 && r.status < 300).length} success
              </span>
              <span className="text-[10px] text-text-secondary">
                {results.filter((r) => r.status >= 400).length} errors
              </span>
            </div>
            <div className="p-2 space-y-0.5">
              {results.slice(0, 50).map((r) => (
                <div key={r.index} className="flex items-center gap-3 text-xs">
                  <span className="text-text-secondary w-8">#{r.index + 1}</span>
                  <span className="font-mono text-text-primary truncate flex-1">{r.payload}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-text-secondary w-14 text-right">{r.time}ms</span>
                </div>
              ))}
              {results.length > 50 && (
                <div className="text-[10px] text-text-secondary text-center">
                  + {results.length - 50} more results
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PayloadPanel;