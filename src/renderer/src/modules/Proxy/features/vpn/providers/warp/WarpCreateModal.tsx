import { useEffect, useState } from 'react';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { cn } from '@renderer/utils/cn';
import { ErrorNote, Field, INPUT, NumField } from '../../../../shared/components/form';
import { errorMessage } from '../../../../shared/utils/error';
import { ProviderModalFooter } from '../../components/ProviderModalFooter';
import type { WarpCreateInput } from './warp.types';
import { useEscapeKey } from '@renderer/modules/Profile/features/browser/hooks/useEscapeKey';

interface WarpCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: WarpCreateInput) => Promise<void>;
}

export function WarpCreateModal({ isOpen, onClose, onCreate }: WarpCreateModalProps) {
  const [license, setLicense] = useState('');
  const [warpCount, setWarpCount] = useState(1);
  const [warpBusy, setWarpBusy] = useState(false);
  const [warpError, setWarpError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLicense('');
      setWarpCount(1);
      setWarpBusy(false);
      setWarpError(null);
    }
  }, [isOpen]);

  useEscapeKey(isOpen, onClose);

  const warpValid = Number.isInteger(warpCount) && warpCount >= 1 && warpCount <= 10;
  const submitWarp = async (): Promise<void> => {
    if (!warpValid) return;
    setWarpBusy(true);
    setWarpError(null);
    try {
      await onCreate({ license: license.trim(), count: warpCount });
      onClose();
    } catch (err) {
      setWarpError(errorMessage(err));
    } finally {
      setWarpBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={warpBusy ? () => undefined : onClose}
      closeOnBackdropClick={false}
      className="max-w-md"
    >
      <ModalHeader
        title="Add WARP proxy"
        description="Each proxy registers its own Cloudflare WARP device and starts automatically"
        onClose={onClose}
      />
      <ModalBody className="flex flex-col gap-4 py-4">
        <Field
          label="Number of proxies"
          hint={!warpValid && <span className="text-[11px] text-error">1–10</span>}
        >
          <NumField value={warpCount} min={1} max={10} suffix="proxy" onChange={setWarpCount} />
        </Field>
        <Field
          label="WARP+ license key"
          hint={<span className="text-[10px] text-text-secondary">Optional</span>}
        >
          <input
            className={cn(INPUT, 'font-mono')}
            value={license}
            autoComplete="off"
            spellCheck={false}
            placeholder="Leave blank for free WARP"
            onChange={(e) => setLicense(e.target.value)}
          />
        </Field>
        <p className="text-[11px] leading-relaxed text-text-secondary">
          Creates local SOCKS5 proxies on 127.0.0.1. Registering a device can take a few seconds per
          proxy.
        </p>
        {warpError && <ErrorNote>{warpError}</ErrorNote>}
      </ModalBody>
      <ProviderModalFooter
        busy={warpBusy}
        submitDisabled={!warpValid}
        label="Create WARP proxy"
        busyLabel="Creating…"
        onCancel={onClose}
        onSubmit={() => void submitWarp()}
      />
    </Modal>
  );
}
