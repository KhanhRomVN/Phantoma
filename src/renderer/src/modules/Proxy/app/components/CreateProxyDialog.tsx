import type { ProxyDraft } from '../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../shared/types/source-domain.types';
import { CreateProxyModal } from '../../features/proxy';
import { FoxholeCreateModal, ProtonCreateModal, WarpCreateModal } from '../../features/vpn';
import type {
  FoxholeCreateInput,
  FoxholeProfileGateway,
  ProtonCredentials,
  WarpCreateInput,
} from '../../features/vpn';

type CreateFlow = 'foxhole' | 'proton' | 'warp' | 'proxy';

/** Which "add" flow the active source needs. Foxhole and Proton accounts and WARP have their own flows. */
function resolveCreateFlow(activeSource: ProxySource | null): CreateFlow {
  if (activeSource?.vpn?.provider === 'foxhole') return 'foxhole';
  if (activeSource?.vpn?.provider === 'proton') return 'proton';
  if (activeSource?.type === 'vendor' && activeSource.provider === 'warp') return 'warp';
  return 'proxy';
}

interface CreateProxyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sources: ProxySource[];
  activeSource: ProxySource | null;
  activeSourceId: string;
  foxholeProfiles: FoxholeProfileGateway;
  onCreate: (draft: ProxyDraft, sourceId: string) => void;
  onCreateWarp: (input: WarpCreateInput) => Promise<void>;
  onCreateFoxhole: (input: FoxholeCreateInput) => Promise<void>;
  onCreateProton: (input: ProtonCredentials) => Promise<void>;
}

/** Picks the right creation modal for the active source. */
export function CreateProxyDialog({
  isOpen,
  onClose,
  sources,
  activeSource,
  activeSourceId,
  foxholeProfiles,
  onCreate,
  onCreateWarp,
  onCreateFoxhole,
  onCreateProton,
}: CreateProxyDialogProps) {
  switch (resolveCreateFlow(activeSource)) {
    case 'foxhole':
      return <FoxholeCreateModal isOpen={isOpen} onClose={onClose} onCreate={onCreateFoxhole} profiles={foxholeProfiles} />;
    case 'proton':
      return <ProtonCreateModal isOpen={isOpen} onClose={onClose} onCreate={onCreateProton} />;
    case 'warp':
      return <WarpCreateModal isOpen={isOpen} onClose={onClose} onCreate={onCreateWarp} />;
    case 'proxy':
      return (
        <CreateProxyModal
          isOpen={isOpen}
          onClose={onClose}
          onCreate={onCreate}
          sources={sources}
          activeSourceId={activeSourceId}
        />
      );
  }
}
