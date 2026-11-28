import { useEffect, useState } from 'react';
import { errorMessage } from '../../../../shared/utils/error';
import type { FoxholeCreateInput, FoxholeProfileGateway, FoxholeProfileOption } from './foxhole.types';

interface UseFoxholeSetupOptions {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: FoxholeCreateInput) => Promise<void>;
  profiles: FoxholeProfileGateway;
}

/** State for the "Add Foxhole account" flow: choices, profile list loading and submit. */
export function useFoxholeSetup({ isOpen, onClose, onCreate, profiles: gateway }: UseFoxholeSetupOptions) {
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState('');
  const [profiles, setProfiles] = useState<FoxholeProfileOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCountry('');
      setProfileId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    gateway
      .listProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((err) => {
        if (!cancelled) setError(`Cannot load profiles: ${errorMessage(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, gateway]);

  useEffect(() => {
    if (!isOpen) {
      setBusy(false);
      setError(null);
    }
  }, [isOpen]);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await onCreate({ country, profileId });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return { country, setCountry, profileId, setProfileId, profiles, busy, error, submit };
}
