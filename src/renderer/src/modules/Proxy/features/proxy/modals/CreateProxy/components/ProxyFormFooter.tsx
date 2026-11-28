import { CheckCircle2, KeyRound, Loader2, Plus, XCircle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import type { TestState } from '../CreateProxyModal.types';

interface ProxyFormFooterProps {
  valid: boolean;
  test: TestState;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function ProxyFormFooter({ valid, test, canSubmit, onClose, onSubmit }: ProxyFormFooterProps) {
  return (
  <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">
    <span
      className={cn(
        'flex items-center gap-1.5 text-[11px]',
        !valid
          ? 'text-warn'
          : test.status === 'ok'
            ? 'text-success'
            : test.status === 'fail'
              ? 'text-error'
              : 'text-text-secondary',
      )}
    >
      {valid && test.status === 'testing' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : valid && test.status === 'ok' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : valid && test.status === 'fail' ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <KeyRound className="h-3 w-3" />
      )}
      {!valid
        ? 'Enter a valid host and port to continue'
        : test.status === 'testing'
          ? 'Testing connection…'
          : test.status === 'ok'
            ? `Reachable · ${test.ms} ms`
            : test.status === 'fail'
              ? 'Connection timed out'
              : 'Ready to add'}
    </span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add proxy
      </button>
    </div>
  </footer>
  );
}
