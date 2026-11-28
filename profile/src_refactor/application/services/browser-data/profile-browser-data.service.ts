import {
  checkDomainSession,
  checkGoogleLogin,
  countPasswordReuse,
  fingerprintHistory,
  getFolderInfo,
  listExecutables,
  listSavedLogins,
  parseBrowserKind,
  passwords,
  readAvatar,
  readExtensionState,
  readHistory,
} from '../../../utils/browser-folder';
import { getDeviceFingerprint } from '../../../utils/system';

// ASSUMED: phase 2 wraps utils/browser-folder + utils/system so controllers do not import them; phase 4 moves the implementation into infrastructure
export const profileBrowserDataService = {
  listExecutables,
  getDeviceFingerprint,
  getFolderInfo,
  readAvatar,
  checkGoogleLogin,
  checkDomainSession,
  listSavedLogins,
  readExtensionState,
  readHistory,
  countPasswordReuse,
  parseBrowserKind,
  passwords,
  fingerprintHistory,
};

export type ProfileBrowserDataService = typeof profileBrowserDataService;