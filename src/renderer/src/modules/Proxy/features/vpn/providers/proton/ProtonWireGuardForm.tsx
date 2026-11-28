import { ClipboardPaste, Eye, EyeOff, FileText } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { ErrorNote, Field, INPUT } from '../../../../shared/components/form';
import { isValidEndpoint } from './proton-validation';
import type { ProtonSetup } from './useProtonSetup';

/** Fields of the "Add ProtonVPN account" flow: QR / config import plus the WireGuard credentials. */
export function ProtonWireGuardForm({ setup }: { setup: ProtonSetup }) {
  const {
    drag,
    setDrag,
    applyImage,
    pasteClipboard,
    conf,
    applyConf,
    hint,
    email,
    setEmail,
    privateKey,
    setPrivateKey,
    reveal,
    setReveal,
    peerKey,
    setPeerKey,
    endpoint,
    setEndpoint,
    error,
  } = setup;

  return (
    <>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const file = Array.from(e.dataTransfer.files).find((f) =>
              f.type.startsWith('image/'),
            );
            if (file) void applyImage(file);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed px-3 py-4 text-center transition-colors',
            drag
              ? 'border-primary bg-primary/10'
              : 'border-text-secondary/30 bg-text-secondary/5 hover:bg-text-secondary/10',
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void applyImage(file);
              e.target.value = '';
            }}
          />
          <FileText className="h-5 w-5 text-text-secondary" />
          <span className="text-xs font-medium text-text-primary">
            Drop a QR image here or click to browse
          </span>
          <span className="text-[10px] text-text-secondary">
            WireGuard configuration QR code (PNG, JPG, WebP…)
          </span>
        </label>
        <Field
          label="WireGuard configuration"
          hint={
            <button
              type="button"
              onClick={() => void pasteClipboard()}
              className="flex h-6 items-center gap-1 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
            >
              <ClipboardPaste className="h-3 w-3" />
              Paste from clipboard
            </button>
          }
        >
          <textarea
            rows={5}
            value={conf}
            spellCheck={false}
            placeholder={
              '[Interface]\nPrivateKey = ...\n\n[Peer]\nPublicKey = ...\nEndpoint = host:port'
            }
            onChange={(e) => applyConf(e.target.value)}
            onPaste={(e) => {
              const item = Array.from(e.clipboardData.items).find((i) =>
                i.type.startsWith('image/'),
              );
              const file = item?.getAsFile();
              if (file) {
                e.preventDefault();
                void applyImage(file);
              }
            }}
            className="w-full resize-none rounded-md bg-text-secondary/10 p-2.5 font-mono text-[11px] leading-relaxed text-text-primary outline-none placeholder:text-text-secondary/70 focus:bg-text-secondary/15"
          />
          {hint && (
            <span className={cn('text-[11px]', hint.ok ? 'text-success' : 'text-error')}>
              {hint.text}
            </span>
          )}
        </Field>
        <Field label="Email">
          <input
            className={INPUT}
            type="email"
            value={email}
            autoComplete="off"
            spellCheck={false}
            placeholder="you@proton.me"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="WireGuard private key">
          <div className="relative">
            <input
              className={cn(INPUT, 'pr-9 font-mono')}
              type={reveal ? 'text' : 'password'}
              value={privateKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
            >
              {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>
        <Field label="WireGuard peer public key">
          <input
            className={cn(INPUT, 'font-mono')}
            value={peerKey}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setPeerKey(e.target.value)}
          />
        </Field>
        <Field
          label="Endpoint"
          hint={
            endpoint.trim() &&
            !isValidEndpoint(endpoint) && (
              <span className="text-[11px] text-error">host:port</span>
            )
          }
        >
          <input
            className={cn(INPUT, 'font-mono')}
            value={endpoint}
            autoComplete="off"
            spellCheck={false}
            placeholder="149.102.251.97:51820"
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
    </>
  );
}
