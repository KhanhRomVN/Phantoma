import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { useEscapeKey } from '../../../../shared/integrations/profile-bridge';
import { ProviderModalFooter } from '../../components/ProviderModalFooter';
import { ProtonWireGuardForm } from './ProtonWireGuardForm';
import type { ProtonCredentials } from './proton.types';
import { useProtonSetup } from './useProtonSetup';

interface ProtonCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: ProtonCredentials) => Promise<void>;
}

export function ProtonCreateModal({ isOpen, onClose, onCreate }: ProtonCreateModalProps) {
  const setup = useProtonSetup({ isOpen, onClose, onCreate });

  useEscapeKey(isOpen, onClose);

  return (
    <Modal
      isOpen={isOpen}
      onClose={setup.busy ? () => undefined : onClose}
      closeOnBackdropClick={false}
      className="max-w-xl"
    >
      <ModalHeader
        title="Add ProtonVPN account"
        description="Local SOCKS5 proxy over ProtonVPN WireGuard via wireproxy"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4 py-4">
        <ProtonWireGuardForm setup={setup} />
      </ModalBody>
      <ProviderModalFooter
        busy={setup.busy}
        submitDisabled={!setup.valid}
        label="Create account"
        busyLabel="Creating…"
        onCancel={onClose}
        onSubmit={() => void setup.submit()}
      />
    </Modal>
  );
}
