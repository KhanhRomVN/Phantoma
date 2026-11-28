import type { Proxy } from '../../shared/types/proxy-domain.types';
import type { ProxySource } from '../../shared/types/source-domain.types';
import { ConfirmDeleteProxyModal, ImportProxyModal } from '../../features/proxy';
import { ConfirmDeleteSourceModal } from '../../features/sources';
import { foxholeProfileGateway } from '../integrations/foxhole-profile.adapter';
import type { useProxyPage } from '../hooks/useProxyPage';
import { CreateProxyDialog } from './CreateProxyDialog';
import { SourceDialog } from './SourceDialog';

type ProxyPageModel = ReturnType<typeof useProxyPage>;

/** Every modal the page can open; only the one matching `dialogs.dialog` is open. */
export function ProxyDialogs({ page }: { page: ProxyPageModel }) {
  const { dialogs, sources, proxies, actions, vpn } = page;
  const deleting: Proxy[] = proxies.deleting;
  const editSourceId: string | null = dialogs.editSourceId;
  const vendorNames = sources.all
    .filter((s: ProxySource) => s.type === 'vendor' && s.id !== editSourceId)
    .map((s) => s.name);

  return (
    <>
      <CreateProxyDialog
        isOpen={dialogs.dialog === 'create'}
        onClose={dialogs.closeDialog}
        sources={sources.view}
        activeSource={sources.active}
        activeSourceId={sources.activeId}
        foxholeProfiles={foxholeProfileGateway}
        onCreate={(d, sourceId) => void actions.createProxy(d, sourceId)}
        onCreateWarp={actions.createWarp}
        onCreateFoxhole={vpn.createFoxhole}
        onCreateProton={vpn.createProton}
      />
      <ImportProxyModal
        isOpen={dialogs.dialog === 'import'}
        onClose={dialogs.closeDialog}
        existingKeys={proxies.existingKeys}
        onImport={(drafts) => void actions.importProxies(drafts)}
      />
      <ConfirmDeleteProxyModal
        isOpen={dialogs.dialog === 'delete'}
        onClose={dialogs.closeDialog}
        onConfirm={() => void actions.confirmDelete()}
        proxies={deleting}
      />
      <SourceDialog
        isOpen={dialogs.dialog === 'source'}
        onClose={dialogs.closeDialog}
        existingNames={vendorNames}
        source={sources.edit}
        onSaved={actions.onSourceSaved}
      />
      <ConfirmDeleteSourceModal
        isOpen={dialogs.dialog === 'deleteSource'}
        onClose={dialogs.closeDialog}
        onConfirm={() => void actions.removeSource()}
        source={sources.deleting}
      />
    </>
  );
}
