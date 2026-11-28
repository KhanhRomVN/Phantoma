import { Globe2 } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { COUNTRY_OPTIONS, ErrorNote, Field, Select } from '../../../../shared/components/form';
import type { Option } from '../../../../shared/components/form';
import { ProviderModalFooter } from '../../components/ProviderModalFooter';
import type { FoxholeCreateInput, FoxholeProfileGateway } from './foxhole.types';
import { useFoxholeSetup } from './useFoxholeSetup';
import { useEscapeKey } from '@renderer/modules/Profile/features/browser/hooks/useEscapeKey';

const countryChoices: Option[] = [
  {
    value: '',
    label: 'Automatic (nearest server)',
    prefix: <Globe2 className="h-3.5 w-3.5 text-text-secondary" />,
  },
  ...COUNTRY_OPTIONS,
];

interface FoxholeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: FoxholeCreateInput) => Promise<void>;
  profiles: FoxholeProfileGateway;
}

export function FoxholeCreateModal({
  isOpen,
  onClose,
  onCreate,
  profiles,
}: FoxholeCreateModalProps) {
  const setup = useFoxholeSetup({ isOpen, onClose, onCreate, profiles });
  const { country, setCountry, profileId, setProfileId, busy, error } = setup;

  useEscapeKey(isOpen, onClose);

  const profileChoices: Option[] = [
    {
      value: '',
      label: 'No profile (temporary browser)',
      prefix: <Globe2 className="h-3.5 w-3.5 text-text-secondary" />,
    },
    ...setup.profiles.map((p) => ({ value: p.id, label: p.label })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onClose}
      closeOnBackdropClick={false}
      className="max-w-md"
    >
      <ModalHeader
        title="Add Foxhole account"
        description="Local SOCKS5 proxy over the free Firefox VPN, one Mozilla account per proxy"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4 py-4">
        <Field
          label="Browser profile"
          hint={<span className="text-[10px] text-text-secondary">Optional</span>}
        >
          <Select value={profileId} options={profileChoices} searchable onChange={setProfileId} />
        </Field>
        <Field
          label="Exit country"
          hint={<span className="text-[10px] text-text-secondary">Optional</span>}
        >
          <Select value={country} options={countryChoices} searchable onChange={setCountry} />
        </Field>
        <p className="text-[11px] leading-relaxed text-text-secondary">
          Creating the account opens Chrome (with the selected profile and a CDP debug port) on the
          Mozilla sign-in page. It closes by itself once you are signed in, then the proxy starts on
          127.0.0.1.
        </p>
        {error && <ErrorNote>{error}</ErrorNote>}
      </ModalBody>
      <ProviderModalFooter
        busy={busy}
        label="Create account"
        busyLabel="Waiting for sign-in…"
        onCancel={onClose}
        onSubmit={() => void setup.submit()}
      />
    </Modal>
  );
}
