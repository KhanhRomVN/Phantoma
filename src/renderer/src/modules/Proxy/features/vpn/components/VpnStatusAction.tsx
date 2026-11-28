import { Power } from 'lucide-react';

interface VpnStatusActionProps {
  busy: boolean;
  activated: boolean;
  online: boolean;
  onToggle: () => void;
}

/** Activate / Start / Stop button for the active VPN source. */
export function VpnStatusAction({ busy, activated, online, onToggle }: VpnStatusActionProps) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className="flex h-7 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50"
    >
      <Power className="h-3.5 w-3.5" />
      {busy ? 'Working…' : !activated ? 'Activate' : online ? 'Stop' : 'Start'}
    </button>
  );
}
