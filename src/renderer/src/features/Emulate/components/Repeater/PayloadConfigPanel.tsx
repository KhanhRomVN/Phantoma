import { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { NetworkRequest } from '../Home/Filter';
import { FuzzerJob, PayloadType } from './types';
import { EMPTY_JOB, countPayloads } from './utils';

interface PayloadConfigPanelProps {
  request: NetworkRequest | null;
  onRun: (job: Omit<FuzzerJob, 'id' | 'createdAt'>) => void;
  isRunning: boolean;
}

export function PayloadConfigPanel({
  request,
  onRun,
  isRunning,
}: PayloadConfigPanelProps) {
  const [form, setForm] = useState<Omit<FuzzerJob, 'id' | 'createdAt'>>(EMPTY_JOB);
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

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
        name: request.path?.split('/').pop() || 'Repeater Job',
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
              <Play className="w-4 h-4" /> Run Repeater
            </>
          )}
        </button>
      </div>
    </div>
  );
}