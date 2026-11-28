import type { ProxySource } from '../../shared/types/source-domain.types';
import { SourceModal } from '../../features/sources';
import { VpnSourceModal } from '../../features/vpn';

interface SourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  source: ProxySource | null;
  onSaved: (sourceId: string) => void;
}

/** VPN-backed sources are configured with their provider's credentials; vendor sources just have a name and website. */
export function SourceDialog({ isOpen, onClose, existingNames, source, onSaved }: SourceDialogProps) {
  if (source?.vpn) {
    return <VpnSourceModal isOpen={isOpen} onClose={onClose} source={source} onSaved={onSaved} />;
  }
  return <SourceModal isOpen={isOpen} onClose={onClose} existingNames={existingNames} source={source} onSaved={onSaved} />;
}
