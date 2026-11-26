export type FoxholeCreateInput = { country: string; profileId: string };

export interface FoxholeProfileOption {
  id: string;
  label: string;
}

export interface FoxholeLaunchFolder {
  userDataDir: string;
  profileDirectory?: string;
}

/**
 * What the Foxhole flow needs from the Profile module. Implemented at the app layer so the VPN
 * feature never imports Profile's API or types.
 */
export interface FoxholeProfileGateway {
  listProfiles(): Promise<FoxholeProfileOption[]>;
  /** Browser folder to launch for the profile, or null when the profile has none. */
  resolveLaunchFolder(profileId: string): Promise<FoxholeLaunchFolder | null>;
}
