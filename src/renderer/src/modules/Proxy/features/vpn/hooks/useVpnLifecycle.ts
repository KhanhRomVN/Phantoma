import { useState } from 'react';
import { toastService } from '@renderer/components/ui/Toast';
import type { ProxySource } from '../../../shared/types/source-domain.types';
import { errorMessage } from '../../../shared/utils/error';
import { vpnApi } from '../api/vpn.api';
import type { FoxholeCreateInput, FoxholeProfileGateway } from '../providers/foxhole/foxhole.types';
import type { ProtonCredentials } from '../providers/proton/proton.types';

interface UseVpnLifecycleOptions {
  /** The source currently shown; only its VPN account (if any) is operated on. */
  activeSource: ProxySource | null;
  reload: () => Promise<void>;
  setError: (message: string | null) => void;
  /** Opens the source dialog (used to activate an account that is not activated yet). */
  openSource: (id: string | null) => void;
  foxholeProfiles: FoxholeProfileGateway;
}

/** Activate / start / stop of the active VPN source, including the Foxhole and Proton creation flows. */
export function useVpnLifecycle({ activeSource, reload, setError, openSource, foxholeProfiles }: UseVpnLifecycleOptions) {
  const [vpnBusy, setVpnBusy] = useState(false);

  const toggleVpn = async (): Promise<void> => {
    const account = activeSource?.vpn;
    if (!account) return;
    if (!account.activated) {
      openSource(account.id);
      return;
    }
    const stopping = !!account.running;
    setVpnBusy(true);
    const toastId = toastService.show({
      id: 'vpn-toggle',
      variant: 'loading',
      title: stopping ? 'Stopping VPN' : 'Starting VPN',
      description: activeSource?.name,
    });
    try {
      if (stopping) await vpnApi.stop(account.id);
      else await vpnApi.start(account.id);
      await reload();
      setError(null);
      toastService.show({
        id: toastId,
        variant: 'success',
        title: stopping ? 'VPN stopped' : 'VPN started',
        description: activeSource?.name,
      });
    } catch (err) {
      setError(errorMessage(err));
      toastService.show({
        id: toastId,
        variant: 'error',
        title: stopping ? 'Stop VPN failed' : 'Start VPN failed',
        description: errorMessage(err),
      });
    } finally {
      setVpnBusy(false);
    }
  };

  const createFoxhole = async (input: FoxholeCreateInput): Promise<void> => {
    const source = activeSource?.vpn;
    if (!source) return;
    const folder = input.profileId ? await foxholeProfiles.resolveLaunchFolder(input.profileId) : null;
    if (source.running) await vpnApi.stop(source.id);
    await vpnApi.activate(source.id, {
      ...(folder
        ? { userDataDir: folder.userDataDir, profileDirectory: folder.profileDirectory }
        : {}),
      profileId: input.profileId || undefined,
    });
    await vpnApi.start(source.id, { country: input.country });
    await reload();
    setError(null);
    toastService.show({ variant: 'success', title: 'Foxhole VPN started', description: input.country });
  };

  const createProton = async (input: ProtonCredentials): Promise<void> => {
    const source = activeSource?.vpn;
    if (!source) return;
    if (source.running) await vpnApi.stop(source.id);
    if (source.accounts.length > 0)
      await vpnApi.update(source.id, { name: input.email, credentials: input });
    else await vpnApi.create({ provider: 'proton', name: input.email, credentials: input });
    await vpnApi.activate(source.id);
    await vpnApi.start(source.id);
    await reload();
    setError(null);
    toastService.show({ variant: 'success', title: 'Proton VPN started', description: input.email });
  };

  return { vpnBusy, toggleVpn, createFoxhole, createProton };
}