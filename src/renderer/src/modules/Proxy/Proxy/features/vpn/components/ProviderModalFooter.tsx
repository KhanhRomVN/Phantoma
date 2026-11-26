import { Loader2, Plus } from 'lucide-react';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';

interface ProviderModalFooterProps {
  busy: boolean;
  submitDisabled?: boolean;
  label: string;
  busyLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}

/** Cancel / submit footer shared by the WARP, Foxhole and Proton creation modals. */
export function ProviderModalFooter({ busy, submitDisabled = false, label, busyLabel, onCancel, onSubmit }: ProviderModalFooterProps) {
  return (
    <ModalFooter className="items-center justify-end gap-2 border-t border-border px-5 py-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30 disabled:hover:bg-primary/10 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled || busy}
        className="flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {busy ? busyLabel : label}
      </button>
    </ModalFooter>
  );
}
