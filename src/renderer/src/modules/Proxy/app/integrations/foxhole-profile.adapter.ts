import { profileApi } from '@renderer/modules/Profile/shared/api/profile.api';
import type { FoxholeProfileGateway } from '../../features/vpn';

/**
 * Adapts the Profile module's API to the small contract the Foxhole flow needs, so the VPN feature
 * never has to know about Profile's types (`launch.userDataDir`, `profileDirectory`, ...).
 */
export const foxholeProfileGateway: FoxholeProfileGateway = {
  async listProfiles() {
    const list = await profileApi.profiles.list();
    return list.map((p) => ({ id: p.id, label: p.email }));
  },
  async resolveLaunchFolder(profileId) {
    const folder = await profileApi.browser.folder(profileId);
    return folder
      ? {
          userDataDir: folder.launch.userDataDir,
          profileDirectory: folder.launch.profileDirectory ?? undefined,
        }
      : null;
  },
};
