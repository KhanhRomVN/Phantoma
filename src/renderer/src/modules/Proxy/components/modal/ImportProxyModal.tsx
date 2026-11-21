import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Download, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { ProxyDraft, ProxyProtocol } from '../../types';
import { PROTOCOLS, PROTOCOL_META, TONE_CLASS } from '../../constants/proxy';

interface ImportProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingKeys: Set<string>;
  onImport: (drafts: ProxyDraft[]) => void;
}

interface ParsedLine {
  raw: string;
  key: string;
  valid: boolean;
  dupe: boolean;
  reason?: string;
  draft?: ProxyDraft;
}

const PLACEHOLDER = 'host:port\nhost:port:user:pass\nsocks5://user:pass@host:port\nhttp://host:port';

function parseLine(raw: string, fallback: ProxyProtocol): Omit<ParsedLine, 'dupe'> {
  let protocol = fallback;
  let rest = raw;
  const m = raw.match(/^([a-zA-Z0-9]+):[/][/](.+)$/);
  if (m) {
    const p = m[1].toLowerCase() as ProxyProtocol;
    if (!PROTOCOLS.includes(p)) return { raw, key: raw, valid: false, reason: `Unknown protocol "${m[1]}"` };
    protocol = p;
    rest = m[2];
  }
  let host = '';
  let port = '';
  let user = '';
  let pass = '';
  if (rest.includes('@')) {
    const idx = rest.lastIndexOf('@');
    const cred = rest.slice(0, idx).split(':');
    const hp = rest.slice(idx + 1).split(':');
    [user, pass] = [cred[0] ?? '', cred.slice(1).join(':')];
    [host, port] = [hp[0] ?? '', hp[1] ?? ''];
  } else {
    const parts = rest.split(':');
    if (parts.length === 2 || parts.length === 4) {
      [host, port, user, pass] = [parts[0], parts[1], parts[2] ?? '', parts[3] ?? ''];
    } else {
      return { raw, key: raw, valid: false, reason: 'Unrecognized format' };
    }
  }
  const portNum = Number(port);
  const key = `${host}:${port}`;
  if (!host) return { raw, key, valid: false, reason: 'Missing host' };
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) return { raw, key, valid: false, reason: 'Invalid port' };
  return {
    raw,
    key,
    valid: true,
    draft: {
      protocol,
      host,
      port: portNum,
      username: user,
      password: pass,
      kind: 'datacenter',
      ownership: 'private',
      country: 'VN',
      provider: 'Self-hosted',
      tags: [],
    },
  };
}

export function ImportProxyModal({ isOpen, onClose, existingKeys, onImport }: ImportProxyModalProps) {
  const [text, setText] = useState('');
  const [protocol, setProtocol] = useState<ProxyProtocol>('http');

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setProtocol('http');
    }
  }, [isOpen]);

  const parsed = useMemo<ParsedLine[]>(() => {
    const seen = new Set<string>();
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((raw) => {
        const p = parseLine(raw, protocol);
        const dupe = p.valid && (existingKeys.has(p.key) || seen.has(p.key));
        if (p.valid) seen.add(p.key);
        return { ...p, dupe };
      });
  }, [text, protocol, existingKeys]);

  const importable = parsed.filter((p) => p.valid && !p.dupe);
  const invalid = parsed.filter((p) => !p.valid).length;
  const dupes = parsed.filter((p) => p.dupe).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-[560px]'>
      <ModalBody className='flex flex-col gap-3.5 px-5 py-5'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-text-primary'>Import proxies</h3>
            <p className='mt-0.5 text-[11px] text-text-secondary'>Paste one proxy per line</p>
          </div>
          <button type='button' onClick={onClose} className='text-text-secondary hover:text-text-primary'>
            <X className='h-4 w-4' />
          </button>
        </div>

        <div className='flex items-center gap-1.5'>
          <span className='mr-1 text-[11px] text-text-secondary'>Default protocol</span>
          {PROTOCOLS.map((p) => (
            <button
              key={p}
              type='button'
              onClick={() => setProtocol(p)}
              className={cn(
                'h-7 rounded-md px-2.5 font-mono text-[11px] font-medium transition-colors',
                protocol === p ? TONE_CLASS[PROTOCOL_META[p].tone].pill : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15',
              )}
            >
              {PROTOCOL_META[p].label}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className='h-36 w-full resize-none rounded-md bg-text-secondary/10 p-3 font-mono text-xs leading-relaxed text-text-primary outline-none placeholder:text-text-secondary/60 focus:bg-text-secondary/15'
        />

        {parsed.length > 0 && (
          <>
            <div className='flex items-center gap-2 text-[11px]'>
              <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium', TONE_CLASS.success.pill)}>
                <CheckCircle2 className='h-3 w-3' />
                {importable.length} ready
              </span>
              {dupes > 0 && (
                <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium', TONE_CLASS.warn.pill)}>
                  <Copy className='h-3 w-3' />
                  {dupes} duplicate
                </span>
              )}
              {invalid > 0 && (
                <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium', TONE_CLASS.error.pill)}>
                  <AlertCircle className='h-3 w-3' />
                  {invalid} invalid
                </span>
              )}
            </div>
            <div className='max-h-40 overflow-y-auto rounded-md bg-card-background p-1.5'>
              {parsed.map((p, i) => (
                <div key={`${p.raw}-${i}`} className='flex items-center gap-2 px-1.5 py-1 text-[11px]'>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      !p.valid ? TONE_CLASS.error.dot : p.dupe ? TONE_CLASS.warn.dot : TONE_CLASS.success.dot,
                    )}
                  />
                  <span className='min-w-0 flex-1 truncate font-mono text-text-primary'>{p.raw}</span>
                  {(!p.valid || p.dupe) && (
                    <span className={cn('shrink-0', p.valid ? 'text-warn' : 'text-error')}>{p.valid ? 'Already exists' : p.reason}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter className='gap-2 border-t border-border px-5 py-3'>
        <button
          type='button'
          onClick={onClose}
          className='h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30'
        >
          Cancel
        </button>
        <button
          type='button'
          disabled={importable.length === 0}
          onClick={() => {
            onImport(importable.map((p) => p.draft as ProxyDraft));
            onClose();
          }}
          className='flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50'
        >
          <Download className='h-3.5 w-3.5' />
          Import {importable.length > 0 ? importable.length : ''}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default ImportProxyModal;